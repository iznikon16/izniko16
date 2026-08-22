import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { InvoiceItemRow, InvoiceProviderAttemptRow, InvoiceRow } from '@/lib/catalog/types';
import type { InvoiceRecord } from '@/lib/invoices/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function hydrateInvoices(client: SupabaseClient<Database>, rows: InvoiceRow[]): Promise<InvoiceRecord[]> {
  if (rows.length === 0) return [];
  const invoiceIds = rows.map((row) => row.id);
  const orderIds = [...new Set(rows.map((row) => row.order_id))];
  const parentIds = [...new Set(rows.map((row) => row.parent_invoice_id).filter(Boolean))] as string[];
  const returnIds = [...new Set(rows.map((row) => row.return_request_id).filter(Boolean))] as string[];
  const [itemsResult,attemptsResult,ordersResult,parentsResult,returnsResult] = await Promise.all([
    client.from('invoice_items').select('*').in('invoice_id',invoiceIds).order('created_at',{ascending:true}),
    client.from('invoice_provider_attempts').select('*').in('invoice_id',invoiceIds).order('created_at',{ascending:false}),
    client.from('orders').select('id,order_number,status').in('id',orderIds),
    parentIds.length ? client.from('invoices').select('id,invoice_number').in('id',parentIds) : Promise.resolve({data:[],error:null}),
    returnIds.length ? client.from('return_requests').select('id,return_number,status').in('id',returnIds) : Promise.resolve({data:[],error:null}),
  ]);
  const error=itemsResult.error??attemptsResult.error??ordersResult.error??parentsResult.error??returnsResult.error;
  if(error) throw new Error(error.message);
  const orderMap=new Map((ordersResult.data??[]).map((row)=>[row.id,row]));
  const parentMap=new Map((parentsResult.data??[]).map((row)=>[row.id,row]));
  const returnMap=new Map((returnsResult.data??[]).map((row)=>[row.id,row]));
  return rows.map((invoice)=>({
    ...invoice,
    attempts:((attemptsResult.data??[]) as InvoiceProviderAttemptRow[]).filter((row)=>row.invoice_id===invoice.id),
    items:((itemsResult.data??[]) as InvoiceItemRow[]).filter((row)=>row.invoice_id===invoice.id),
    order:orderMap.get(invoice.order_id)??null,
    parent:invoice.parent_invoice_id?parentMap.get(invoice.parent_invoice_id)??null:null,
    returnRequest:invoice.return_request_id?returnMap.get(invoice.return_request_id)??null:null,
  }));
}

export async function getAdminInvoices() {
  const client=createAdminClient();
  const {data,error}=await client.from('invoices').select('*').order('issued_at',{ascending:false});
  if(error) throw new Error(error.message);
  return hydrateInvoices(client,(data??[]) as InvoiceRow[]);
}

export async function getAdminInvoice(invoiceId:string) {
  const client=createAdminClient();
  const {data,error}=await client.from('invoices').select('*').eq('id',invoiceId).maybeSingle();
  if(error) throw new Error(error.message);
  if(!data) return null;
  return (await hydrateInvoices(client,[data as InvoiceRow]))[0]??null;
}

export async function getInvoiceEligibleOrders() {
  const client=createAdminClient();
  const [{data:orders,error:ordersError},{data:invoices,error:invoiceError}]=await Promise.all([
    client.from('orders').select('id,order_number,user_id,status,total,customer_name,customer_email,billing_address').in('status',['confirmed','preparing','shipped','completed']).gt('total',0).order('created_at',{ascending:false}),
    client.from('invoices').select('order_id').eq('document_type','invoice'),
  ]);
  if(ordersError||invoiceError) throw new Error(ordersError?.message??invoiceError?.message??'Siparişler okunamadı.');
  const invoiced=new Set((invoices??[]).map((row)=>row.order_id));
  return (orders??[]).filter((row)=>!invoiced.has(row.id));
}

export async function getInvoiceRefundCandidates(orderId:string) {
  const client=createAdminClient();
  const [{data:returns,error:returnError},{data:documents,error:documentError}]=await Promise.all([
    client.from('return_requests').select('id,return_number,status,total_refund_amount').eq('order_id',orderId).in('status',['refunded','completed']).order('refunded_at',{ascending:false}),
    client.from('invoices').select('return_request_id').eq('document_type','refund').not('return_request_id','is',null),
  ]);
  if(returnError||documentError) throw new Error(returnError?.message??documentError?.message??'İadeler okunamadı.');
  const documented=new Set((documents??[]).map((row)=>row.return_request_id));
  return (returns??[]).filter((row)=>!documented.has(row.id));
}

export async function getInvoiceChildren(invoiceId:string) {
  const client=createAdminClient();
  const {data,error}=await client.from('invoices').select('id,invoice_number,document_type,status,total,return_request_id').eq('parent_invoice_id',invoiceId).order('issued_at',{ascending:false});
  if(error) throw new Error(error.message);
  return data??[];
}

export async function getCustomerInvoices(userId:string) {
  const client=await createClient();
  const {data,error}=await client.from('invoices').select('*').eq('user_id',userId).order('issued_at',{ascending:false});
  if(error) throw new Error(error.message);
  return hydrateInvoices(client,(data??[]) as InvoiceRow[]);
}

export async function getCustomerInvoice(userId:string,invoiceId:string) {
  const client=await createClient();
  const {data,error}=await client.from('invoices').select('*').eq('id',invoiceId).eq('user_id',userId).maybeSingle();
  if(error) throw new Error(error.message);
  if(!data) return null;
  return (await hydrateInvoices(client,[data as InvoiceRow]))[0]??null;
}

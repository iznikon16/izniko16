'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/auth/admin';
import { writeAuditLog } from '@/lib/audit/queries';
import { getAdminInvoice } from '@/lib/invoices/queries';
import { getEInvoiceProvider } from '@/lib/invoices/provider';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';

function text(formData:FormData,key:string){return String(formData.get(key)??'').trim();}
function revalidateInvoices(){
  revalidatePath('/admin/invoices');
  revalidatePath('/hesabim/faturalarim');
  revalidatePath('/hesabim/siparislerim');
}

function companySnapshot():Json {
  return {
    address:process.env.COMPANY_ADDRESS?.trim()||'',
    name:process.env.COMPANY_NAME?.trim()||'İzniko Ticaret',
    phone:process.env.COMPANY_PHONE?.trim()||'',
    tax_info:process.env.COMPANY_TAX_INFO?.trim()||'',
  };
}

export async function createOrderInvoiceAction(formData:FormData){
  const session=await requireAdminPermission('invoice.manage');
  const orderId=text(formData,'order_id');
  const taxRate=Number(text(formData,'tax_rate')||'20');
  if(!orderId||!Number.isFinite(taxRate)||taxRate<0||taxRate>100) throw new Error('Sipariş veya KDV oranı geçersiz.');
  const supabase=createAdminClient();
  const {data:order,error:orderError}=await supabase.from('orders').select('billing_address').eq('id',orderId).maybeSingle();
  if(orderError||!order) throw new Error(orderError?.message??'Sipariş bulunamadı.');
  const dueDate=text(formData,'due_date');
  const {data,error}=await supabase.rpc('create_order_invoice',{
    p_actor_user_id:session.user.id,
    p_billing_address:order.billing_address,
    p_company_snapshot:companySnapshot(),
    p_customer_tax_number:text(formData,'customer_tax_number'),
    p_customer_tax_office:text(formData,'customer_tax_office'),
    p_due_date:dueDate||undefined,
    p_note:text(formData,'note'),
    p_order_id:orderId,
    p_tax_rate:taxRate,
  });
  if(error||!data?.[0]) throw new Error(error?.message??'Fatura oluşturulamadı.');
  revalidateInvoices();
  return data[0];
}

export async function createInvoiceAdjustmentAction(formData:FormData){
  const session=await requireAdminPermission('invoice.manage');
  const invoiceId=text(formData,'invoice_id');
  const documentType=text(formData,'document_type');
  if(!invoiceId||!['cancellation','refund'].includes(documentType)) throw new Error('Belge bilgileri geçersiz.');
  const supabase=createAdminClient();
  const {data,error}=await supabase.rpc('create_invoice_adjustment',{
    p_actor_user_id:session.user.id,
    p_document_type:documentType,
    p_invoice_id:invoiceId,
    p_note:text(formData,'note'),
    p_return_request_id:documentType==='refund'?text(formData,'return_request_id')||undefined:undefined,
  });
  if(error||!data?.[0]) throw new Error(error?.message??'Düzeltme belgesi oluşturulamadı.');
  revalidateInvoices();
  return data[0];
}

export async function checkEInvoiceProviderAction(formData:FormData){
  const session=await requireAdminPermission('invoice.manage');
  const invoiceId=text(formData,'invoice_id');
  const action=text(formData,'provider_action')==='cancel'?'cancel':'send';
  const invoice=await getAdminInvoice(invoiceId);
  if(!invoice) throw new Error('Fatura bulunamadı.');
  const provider=getEInvoiceProvider();
  let result;
  try {
    result=action==='cancel'?await provider.cancel(invoice):await provider.send(invoice);
  } catch(error) {
    result={status:'failed' as const,message:error instanceof Error?error.message.slice(0,200):'Sağlayıcı işlemi başarısız.'};
  }
  const safeMessage=result.message.replace(/[\r\n]+/g,' ').slice(0,200);
  const supabase=createAdminClient();
  const [{error:attemptError},{error:updateError}]=await Promise.all([
    supabase.from('invoice_provider_attempts').insert({invoice_id:invoice.id,provider:provider.key,action,status:result.status,provider_reference:result.providerReference??null,safe_message:safeMessage,actor_user_id:session.user.id}),
    supabase.from('invoices').update({provider_status:result.status,provider_reference:result.providerReference??null,provider_error:result.status==='failed'?safeMessage:''}).eq('id',invoice.id),
  ]);
  if(attemptError||updateError) throw new Error(attemptError?.message??updateError?.message??'Sağlayıcı durumu kaydedilemedi.');
  await writeAuditLog({actorUserId:session.user.id,action:`invoice.provider_${action}`,resourceType:'invoice',resourceId:invoice.id,newValue:{provider:provider.key,status:result.status}});
  revalidateInvoices();
  return {ok:result.status!=='failed',message:safeMessage,status:result.status};
}

import 'server-only';

import pdfMake from 'pdfmake';
import robotoFonts from 'pdfmake/fonts/Roboto';
import type { Content,TableCell,TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Json } from '@/lib/supabase/database.types';
import type { InvoiceAddress,InvoiceRecord } from '@/lib/invoices/types';
import { INVOICE_DOCUMENT_LABELS } from '@/lib/invoices/types';

pdfMake.addFonts(robotoFonts);
pdfMake.setUrlAccessPolicy(()=>false);
pdfMake.setLocalAccessPolicy((filePath)=>/pdfmake[\\/]fonts[\\/]Roboto[\\/]/.test(filePath));

const date=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul'});
const money=(value:number,currency:string)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency}).format(value);

function object(value:Json):Record<string,Json|undefined>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,Json|undefined>:{};}
function text(value:Json|undefined){return typeof value==='string'?value:'';}

export function invoiceAddressLines(value:Json):string[]{
  const address=object(value) as InvoiceAddress;
  return [address.neighborhood,address.address_line,[address.district,address.city].filter(Boolean).join(' / '),address.postal_code].filter((line):line is string=>Boolean(line));
}

export function createInvoiceFileName(invoiceNumber:string, documentType = 'invoice'){
  const prefix = documentType === 'sales_document' ? 'satis-belgesi' : 'fatura';
  return `${prefix}-${invoiceNumber.toLocaleLowerCase('tr-TR')}.pdf`;
}

export async function buildInvoicePdf(invoice:InvoiceRecord){
  const company=object(invoice.company_snapshot);
  const companyName=text(company.name)||'İzniko Ticaret';
  const companyLines=[text(company.address),text(company.phone),text(company.tax_info)].filter(Boolean);
  const documentLabel=INVOICE_DOCUMENT_LABELS[invoice.document_type as keyof typeof INVOICE_DOCUMENT_LABELS]??'Fatura';
  const body:TableCell[][]=[
    ['Ürün / Hizmet','Miktar','Birim Fiyat','İndirim','KDV','Tutar'].map((value)=>({text:value,style:'tableHeader'})),
    ...invoice.items.map((item)=>[
      `${item.product_title}${item.product_sku?`\n${item.product_sku}`:''}`,
      String(item.quantity),money(item.unit_price,invoice.currency),money(item.discount_amount,invoice.currency),
      `%${item.tax_rate} · ${money(item.tax_amount,invoice.currency)}`,money(item.line_total,invoice.currency),
    ]),
  ];
  const content:Content[]=[
    {columns:[{stack:[{text:companyName,style:'title'},...companyLines.map((line)=>({text:line,style:'muted'}))]},{stack:[{text:documentLabel,style:'documentTitle'},{text:invoice.invoice_number,bold:true,alignment:'right'},{text:date.format(new Date(invoice.issued_at)),style:'rightMuted'}],width:210}],columnGap:20},
    {canvas:[{type:'line',x1:0,y1:0,x2:530,y2:0,lineColor:'#cbd5e1'}],margin:[0,14,0,14]},
    {columns:[{stack:[{text:'Sayın',style:'label'},{text:invoice.customer_name,bold:true},{text:invoice.customer_email,style:'muted'},...invoiceAddressLines(invoice.billing_address).map((line)=>({text:line,style:'muted'}))]},{stack:[{text:'Vergi Bilgileri',style:'label'},{text:invoice.customer_tax_office||'—',alignment:'right'},{text:invoice.customer_tax_number||'—',style:'rightMuted'}],width:190}],margin:[0,0,0,14]},
    {table:{headerRows:1,widths:['*',42,70,62,74,76],body},layout:'lightHorizontalLines'},
    {columns:[{text:invoice.note||'',style:'muted',margin:[0,14,20,0]},{stack:[
      {text:`Ara toplam: ${money(invoice.subtotal,invoice.currency)}`,alignment:'right'},
      {text:`İndirim: ${money(invoice.discount_total,invoice.currency)}`,alignment:'right'},
      {text:`Kargo: ${money(invoice.shipping_total,invoice.currency)}`,alignment:'right'},
      {text:`KDV (dahil): ${money(invoice.tax_total,invoice.currency)}`,alignment:'right'},
      {text:`Genel toplam: ${money(invoice.total,invoice.currency)}`,style:'total'},
    ],width:220}],columnGap:20},
    ...(invoice.parent?[{text:`Bağlı belge: ${invoice.parent.invoice_number}`,style:'relation',margin:[0,18,0,0]} as Content]:[]),
  ];
  const definition:TDocumentDefinitions={pageSize:'A4',pageMargins:[32,36,32,36],defaultStyle:{font:'Roboto',fontSize:9,color:'#1f2937'},info:{title:`${documentLabel} ${invoice.invoice_number}`,author:companyName},content,footer:(page,pages)=>({text:`${invoice.invoice_number} · ${page}/${pages}`,alignment:'center',fontSize:8,color:'#64748b',margin:[0,10,0,0]}),styles:{title:{fontSize:18,bold:true,color:'#0369a1'},documentTitle:{fontSize:16,bold:true,color:'#0f172a',alignment:'right'},muted:{fontSize:8,color:'#64748b'},rightMuted:{fontSize:8,color:'#64748b',alignment:'right'},label:{fontSize:8,bold:true,color:'#64748b',margin:[0,0,0,3]},tableHeader:{bold:true,color:'#fff',fillColor:'#0284c7',margin:[3,5,3,5]},total:{fontSize:13,bold:true,color:'#0369a1',alignment:'right',margin:[0,6,0,0]},relation:{fontSize:8,color:'#475569'}}};
  return new Uint8Array(await pdfMake.createPdf(definition).getBuffer());
}

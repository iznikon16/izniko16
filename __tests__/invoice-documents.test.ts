import { buildInvoicePdf, createInvoiceFileName, invoiceAddressLines } from '@/lib/invoices/documents';
import { getEInvoiceProvider } from '@/lib/invoices/provider';
import type { InvoiceRecord } from '@/lib/invoices/types';

const invoice = {
  attempts: [],
  billing_address: {
    address_line: 'İznik Caddesi No: 16',
    city: 'Bursa',
    district: 'İznik',
    neighborhood: 'Selçuk Mahallesi',
    postal_code: '16860',
  },
  cancelled_at: null,
  company_snapshot: {
    address: 'İznik / Bursa',
    name: 'İzniko Ticaret',
    phone: '0224 000 00 00',
    tax_info: 'İznik VD 1234567890',
  },
  created_at: '2026-08-22T10:00:00.000Z',
  created_by: null,
  currency: 'TRY',
  customer_email: 'musteri@example.com',
  customer_name: 'Örnek Müşteri',
  customer_phone: '0555 000 00 00',
  customer_tax_number: '1234567890',
  customer_tax_office: 'İznik',
  discount_total: 10,
  document_type: 'invoice',
  due_date: '2026-09-22',
  id: '00000000-0000-0000-0000-000000000101',
  invoice_number: 'FAT-2026-0000001',
  issued_at: '2026-08-22T10:00:00.000Z',
  items: [{
    created_at: '2026-08-22T10:00:00.000Z',
    discount_amount: 10,
    gross_amount: 250,
    id: '00000000-0000-0000-0000-000000000102',
    invoice_id: '00000000-0000-0000-0000-000000000101',
    line_total: 240,
    order_item_id: null,
    product_id: null,
    product_sku: 'IZN-TEST',
    product_title: 'İzniko Test Ürünü',
    quantity: 2,
    tax_amount: 40,
    tax_rate: 20,
    unit_price: 125,
  }],
  note: 'Test faturası',
  order: { id: '00000000-0000-0000-0000-000000000103', order_number: 'SIP-2026-0001', status: 'completed' },
  order_id: '00000000-0000-0000-0000-000000000103',
  parent: null,
  parent_invoice_id: null,
  provider_error: '',
  provider_reference: null,
  provider_status: 'pending',
  returnRequest: null,
  return_request_id: null,
  shipping_total: 0,
  status: 'issued',
  subtotal: 250,
  tax_included: true,
  tax_rate: 20,
  tax_total: 40,
  total: 240,
  updated_at: '2026-08-22T10:00:00.000Z',
  user_id: '00000000-0000-0000-0000-000000000104',
} as InvoiceRecord;

describe('fatura belgeleri', () => {
  it('adres satırlarını boş alanları çıkartarak sıralar', () => {
    expect(invoiceAddressLines(invoice.billing_address)).toEqual([
      'Selçuk Mahallesi',
      'İznik Caddesi No: 16',
      'İznik / Bursa',
      '16860',
    ]);
  });

  it('Türkçe küçük harf kurallarıyla güvenli dosya adı üretir', () => {
    expect(createInvoiceFileName('FAT-İZNİK-0001')).toBe('fatura-fat-iznik-0001.pdf');
  });

  it('yerel fontlarla geçerli PDF oluşturur', async () => {
    const pdf = await buildInvoicePdf(invoice);
    expect(pdf.byteLength).toBeGreaterThan(1_000);
    expect(Buffer.from(pdf).subarray(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('sağlayıcı yokken gönderim yapmaz ve sahte başarı döndürmez', async () => {
    const provider = getEInvoiceProvider();
    const result = await provider.send(invoice);
    expect(provider.key).toBe('disabled');
    expect(result.status).toBe('disabled');
    expect(result.providerReference).toBeUndefined();
  });
});

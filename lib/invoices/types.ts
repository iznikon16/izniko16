import type {
  InvoiceItemRow,
  InvoiceProviderAttemptRow,
  InvoiceRow,
  OrderRow,
  ReturnRequestRow,
} from '@/lib/catalog/types';

export const INVOICE_DOCUMENT_LABELS = {
  cancellation: 'İptal Belgesi',
  invoice: 'Fatura',
  refund: 'İade Belgesi',
} as const;

export type InvoiceDocumentType = keyof typeof INVOICE_DOCUMENT_LABELS;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  cancelled: 'İptal Edildi',
  issued: 'Düzenlendi',
};

export const INVOICE_PROVIDER_STATUS_LABELS: Record<string, string> = {
  cancelled: 'Sağlayıcıda İptal Edildi',
  disabled: 'Sağlayıcı Bağlı Değil',
  failed: 'Gönderim Başarısız',
  pending: 'Gönderim Bekliyor',
  sent: 'Gönderildi',
};

export type InvoiceRecord = InvoiceRow & {
  attempts: InvoiceProviderAttemptRow[];
  items: InvoiceItemRow[];
  order: Pick<OrderRow, 'id' | 'order_number' | 'status'> | null;
  parent: Pick<InvoiceRow, 'id' | 'invoice_number'> | null;
  returnRequest: Pick<ReturnRequestRow, 'id' | 'return_number' | 'status'> | null;
};

export type InvoiceAddress = {
  address_line?: string;
  city?: string;
  district?: string;
  full_name?: string;
  neighborhood?: string;
  phone?: string;
  postal_code?: string;
  tax_number?: string;
  tax_office?: string;
};

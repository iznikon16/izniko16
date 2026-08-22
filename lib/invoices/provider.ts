import 'server-only';

import type { InvoiceRecord } from '@/lib/invoices/types';

export type InvoiceProviderResult = {
  message: string;
  providerReference?: string;
  status: 'cancelled' | 'disabled' | 'failed' | 'sent';
};

export interface EInvoiceProvider {
  readonly key: string;
  cancel(invoice: InvoiceRecord): Promise<InvoiceProviderResult>;
  send(invoice: InvoiceRecord): Promise<InvoiceProviderResult>;
}

class DisabledEInvoiceProvider implements EInvoiceProvider {
  readonly key='disabled';
  async send():Promise<InvoiceProviderResult>{
    return {status:'disabled',message:'e-Fatura sağlayıcısı yapılandırılmadı; hiçbir belge gönderilmedi.'};
  }
  async cancel():Promise<InvoiceProviderResult>{
    return {status:'disabled',message:'e-Fatura sağlayıcısı yapılandırılmadı; sağlayıcı tarafında iptal yapılmadı.'};
  }
}

export function getEInvoiceProvider():EInvoiceProvider {
  return new DisabledEInvoiceProvider();
}

import { z } from 'zod';

export const customerProfileSchema = z.object({
  accountType: z.enum(['individual', 'corporate']),
  companyTitle: z.string().trim().max(160),
  fullName: z.string().trim().min(2, 'Ad soyad zorunludur.').max(120),
  marketingConsent: z.boolean(),
  phone: z.string().trim().refine((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }, 'Geçerli bir telefon numarası girin.'),
  taxNumber: z.string().trim(),
  taxOffice: z.string().trim().max(100),
}).superRefine((value, context) => {
  if (value.accountType !== 'corporate') return;
  if (!value.companyTitle) context.addIssue({ code: 'custom', message: 'Şirket unvanı zorunludur.', path: ['companyTitle'] });
  if (!value.taxOffice) context.addIssue({ code: 'custom', message: 'Vergi dairesi zorunludur.', path: ['taxOffice'] });
  if (!/^\d{10}$/.test(value.taxNumber)) context.addIssue({ code: 'custom', message: 'Vergi numarası 10 haneli olmalıdır.', path: ['taxNumber'] });
});

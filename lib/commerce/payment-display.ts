import type { Json } from '@/lib/supabase/database.types';

export type BankTransferDetails = {
  accountOwner: string | null;
  bankName: string | null;
  iban: string | null;
  supportPhone: string | null;
};

export const emptyBankTransferDetails: BankTransferDetails = {
  accountOwner: null,
  bankName: null,
  iban: null,
  supportPhone: null,
};

export function asPaymentRecord(value: unknown): Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)) ? (value as Record<string, unknown>) : {};
}

function getRecordText(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function getBankTransferDetails(source: Json | Record<string, unknown> | null | undefined): BankTransferDetails {
  const record = asPaymentRecord(source);

  return {
    accountOwner: getRecordText(record, 'accountOwner', 'account_owner'),
    bankName: getRecordText(record, 'bankName', 'bank_name'),
    iban: getRecordText(record, 'iban'),
    supportPhone: getRecordText(record, 'supportPhone', 'support_phone'),
  };
}

export function mergeBankTransferDetails(primary: BankTransferDetails, fallback: BankTransferDetails): BankTransferDetails {
  return {
    accountOwner: primary.accountOwner ?? fallback.accountOwner,
    bankName: primary.bankName ?? fallback.bankName,
    iban: primary.iban ?? fallback.iban,
    supportPhone: primary.supportPhone ?? fallback.supportPhone,
  };
}

export function hasBankTransferDetails(details: BankTransferDetails) {
  return Boolean(details.accountOwner || details.bankName || details.iban || details.supportPhone);
}

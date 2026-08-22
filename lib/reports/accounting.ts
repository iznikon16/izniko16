import ExcelJS from 'exceljs';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import { attachmentHeaders, escapeCsvCell, sanitizeSpreadsheetCell } from '@/lib/accounting/statement-export';

export const ACCOUNTING_REPORT_TYPES = ['balances', 'debit-credit', 'collections', 'overdue', 'due', 'risk'] as const;
export type AccountingReportType = (typeof ACCOUNTING_REPORT_TYPES)[number];

export type AccountingReportFilters = {
  type: AccountingReportType;
  query: string;
  fromDate: string;
  toDate: string;
};

export type AccountingReportColumn = {
  key: string;
  label: string;
  kind?: 'money' | 'date' | 'number' | 'text';
};

export type AccountingReportRow = {
  id: string;
  values: Record<string, string | number | null>;
};

export type AccountingReportResult = {
  title: string;
  description: string;
  columns: AccountingReportColumn[];
  rows: AccountingReportRow[];
  totalAmount: number;
  truncated: boolean;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 5000;

export const REPORT_TYPE_LABELS: Record<AccountingReportType, string> = {
  balances: 'Müşteri Bakiye Raporu',
  'debit-credit': 'Borç / Alacak Raporu',
  collections: 'Tahsilat Raporu',
  overdue: 'Geciken Ödeme Raporu',
  due: 'Vade Raporu',
  risk: 'Risk Limiti Raporu',
};

function validDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function istanbulToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

export function parseAccountingReportFilters(searchParams: URLSearchParams): AccountingReportFilters {
  const today = istanbulToday();
  const requestedType = searchParams.get('type')?.trim() ?? '';
  const type = ACCOUNTING_REPORT_TYPES.includes(requestedType as AccountingReportType)
    ? requestedType as AccountingReportType
    : 'balances';
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);
  const fromDate = searchParams.get('from')?.trim() || monthStart(today);
  const toDate = searchParams.get('to')?.trim() || today;

  if (!validDate(fromDate) || !validDate(toDate)) throw new Error('Geçerli bir tarih aralığı seçilmelidir.');
  if (fromDate > toDate) throw new Error('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
  return { type, query, fromDate, toDate };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function escapeOrSearch(value: string) {
  return escapeLike(value.replace(/[,()\"]/g, ' '));
}

function money(value: unknown) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

type SummaryRow = Database['public']['Views']['customer_account_summaries']['Row'];
type DueRow = Database['public']['Views']['customer_receivable_due_status']['Row'];

function customerValues(row: SummaryRow) {
  return {
    customer: row.customer_name || row.email || 'İsimsiz müşteri',
    email: row.email || '',
    accountCode: row.account_code || '',
  };
}

async function accountReport(filters: AccountingReportFilters): Promise<AccountingReportResult> {
  const supabase = createAdminClient();
  let query = supabase.from('customer_account_summaries').select('*', { count: 'exact' });
  if (filters.query) query = query.ilike('search_text', `%${escapeLike(filters.query)}%`);
  if (filters.type === 'risk') query = query.gt('risk_limit', 0);
  const result = await query.order(filters.type === 'risk' ? 'risk_limit' : 'balance', { ascending: false }).limit(MAX_ROWS);
  if (result.error) throw new Error('Finansal rapor verileri alınamadı.');
  const rows = (result.data ?? []) as SummaryRow[];

  if (filters.type === 'risk') {
    return {
      title: REPORT_TYPE_LABELS.risk,
      description: 'Müşteri risk limiti, kullanılan ve kullanılabilir limit özeti.',
      columns: [
        { key: 'customer', label: 'Müşteri' }, { key: 'email', label: 'E-posta' },
        { key: 'accountCode', label: 'Cari Kodu' }, { key: 'riskLimit', label: 'Risk Limiti', kind: 'money' },
        { key: 'usedLimit', label: 'Kullanılan Limit', kind: 'money' }, { key: 'availableLimit', label: 'Kullanılabilir', kind: 'money' },
        { key: 'riskStatus', label: 'Durum' },
      ],
      rows: rows.map((row, index) => ({ id: row.customer_id || String(index), values: {
        ...customerValues(row), riskLimit: money(row.risk_limit), usedLimit: Math.max(0, money(row.risk_limit) - money(row.available_limit)),
        availableLimit: money(row.available_limit), riskStatus: row.risk_exceeded ? 'Limit aşıldı' : 'Normal',
      } })),
      totalAmount: rows.reduce((sum, row) => sum + money(row.risk_limit), 0),
      truncated: (result.count ?? 0) > MAX_ROWS,
    };
  }

  const balanceColumns: AccountingReportColumn[] = [
    { key: 'customer', label: 'Müşteri' }, { key: 'email', label: 'E-posta' }, { key: 'accountCode', label: 'Cari Kodu' },
    { key: 'totalDebit', label: 'Toplam Borç', kind: 'money' }, { key: 'totalCredit', label: 'Toplam Alacak', kind: 'money' },
    { key: 'balance', label: 'Bakiye', kind: 'money' }, { key: 'overdueBalance', label: 'Geciken', kind: 'money' },
  ];
  return {
    title: REPORT_TYPE_LABELS[filters.type],
    description: filters.type === 'debit-credit' ? 'Cari hesapların toplam borç ve alacak hareketleri.' : 'Müşteri bazında güncel cari bakiye özeti.',
    columns: balanceColumns,
    rows: rows.map((row, index) => ({ id: row.customer_id || String(index), values: {
      ...customerValues(row), totalDebit: money(row.total_debit), totalCredit: money(row.total_credit),
      balance: money(row.balance), overdueBalance: money(row.overdue_balance),
    } })),
    totalAmount: rows.reduce((sum, row) => sum + money(row.balance), 0),
    truncated: (result.count ?? 0) > MAX_ROWS,
  };
}

async function dueReport(filters: AccountingReportFilters): Promise<AccountingReportResult> {
  const supabase = createAdminClient();
  let query = supabase.from('customer_receivable_due_status').select('*', { count: 'exact' })
    .gt('remaining_amount', 0).gte('due_date', filters.fromDate).lte('due_date', filters.toDate);
  if (filters.type === 'overdue') query = query.gt('overdue_days', 0);
  else query = query.lte('overdue_days', 0);
  if (filters.query) {
    const search = escapeOrSearch(filters.query);
    query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,order_number.ilike.%${search}%,reference.ilike.%${search}%`);
  }
  const result = await query.order('due_date', { ascending: true }).limit(MAX_ROWS);
  if (result.error) throw new Error('Vade raporu verileri alınamadı.');
  const rows = (result.data ?? []) as DueRow[];
  return {
    title: REPORT_TYPE_LABELS[filters.type],
    description: filters.type === 'overdue' ? 'Vadesi geçmiş ve kapanmamış müşteri alacakları.' : 'Seçilen tarih aralığında vadesi gelen açık alacaklar.',
    columns: [
      { key: 'customer', label: 'Müşteri' }, { key: 'email', label: 'E-posta' }, { key: 'orderNumber', label: 'Sipariş' },
      { key: 'reference', label: 'Referans' }, { key: 'dueDate', label: 'Vade', kind: 'date' },
      { key: 'originalAmount', label: 'Borç', kind: 'money' }, { key: 'paidAmount', label: 'Ödenen', kind: 'money' },
      { key: 'remainingAmount', label: 'Kalan', kind: 'money' }, { key: 'dayStatus', label: 'Gün Durumu' },
    ],
    rows: rows.map((row, index) => ({ id: row.transaction_id || String(index), values: {
      customer: row.customer_name || row.customer_email || 'İsimsiz müşteri', email: row.customer_email || '',
      orderNumber: row.order_number || '', reference: row.reference || '', dueDate: row.due_date,
      originalAmount: money(row.original_amount), paidAmount: money(row.paid_amount), remainingAmount: money(row.remaining_amount),
      dayStatus: money(row.overdue_days) > 0 ? `${money(row.overdue_days)} gün gecikti` : `${money(row.remaining_days)} gün kaldı`,
    } })),
    totalAmount: rows.reduce((sum, row) => sum + money(row.remaining_amount), 0),
    truncated: (result.count ?? 0) > MAX_ROWS,
  };
}

async function collectionReport(filters: AccountingReportFilters): Promise<AccountingReportResult> {
  const supabase = createAdminClient();
  const from = `${filters.fromDate}T00:00:00+03:00`;
  const to = `${filters.toDate}T23:59:59.999+03:00`;
  const search = filters.query ? escapeOrSearch(filters.query) : '';
  const matchingProfiles = search
    ? await supabase.from('customer_profiles').select('user_id').or(`full_name.ilike.%${search}%,email.ilike.%${search}%`).limit(MAX_ROWS)
    : { data: [], error: null };
  if (matchingProfiles.error) throw new Error('Müşteri filtresi uygulanamadı.');
  const matchingCustomerIds = (matchingProfiles.data ?? []).map((row) => row.user_id);
  let paymentsQuery = supabase.from('payments').select('*', { count: 'exact' })
    .gte('paid_at', from).lte('paid_at', to);
  if (search) {
    const clauses = [`reference_number.ilike.%${search}%`, `payment_method.ilike.%${search}%`];
    if (matchingCustomerIds.length) clauses.push(`customer_id.in.(${matchingCustomerIds.join(',')})`);
    paymentsQuery = paymentsQuery.or(clauses.join(','));
  }
  const paymentsResult = await paymentsQuery.order('paid_at', { ascending: false }).limit(MAX_ROWS);
  if (paymentsResult.error) throw new Error('Tahsilat raporu verileri alınamadı.');
  const customerIds = [...new Set((paymentsResult.data ?? []).map((row) => row.customer_id))];
  const profilesResult = customerIds.length
    ? await supabase.from('customer_profiles').select('user_id, full_name, email').in('user_id', customerIds)
    : { data: [], error: null };
  if (profilesResult.error) throw new Error('Müşteri bilgileri alınamadı.');
  const profiles = new Map((profilesResult.data ?? []).map((row) => [row.user_id, row]));
  const payments = paymentsResult.data ?? [];
  return {
    title: REPORT_TYPE_LABELS.collections,
    description: 'Seçilen tarih aralığında kaydedilen tahsilatlar ve durumları.',
    columns: [
      { key: 'customer', label: 'Müşteri' }, { key: 'email', label: 'E-posta' }, { key: 'paidAt', label: 'Tarih', kind: 'date' },
      { key: 'paymentMethod', label: 'Yöntem' }, { key: 'reference', label: 'Referans' },
      { key: 'status', label: 'Durum' }, { key: 'amount', label: 'Tutar', kind: 'money' },
    ],
    rows: payments.map((payment) => {
      const customer = profiles.get(payment.customer_id);
      return { id: payment.id, values: { customer: customer?.full_name || customer?.email || 'İsimsiz müşteri', email: customer?.email || '',
        paidAt: payment.paid_at, paymentMethod: payment.payment_method, reference: payment.reference_number,
        status: payment.status === 'reversed' ? 'İptal' : 'Aktif', amount: money(payment.amount) } };
    }),
    totalAmount: payments.filter((row) => row.status !== 'reversed').reduce((sum, row) => sum + money(row.amount), 0),
    truncated: (paymentsResult.count ?? 0) > MAX_ROWS,
  };
}

export async function getAccountingReport(filters: AccountingReportFilters) {
  if (filters.type === 'collections') return collectionReport(filters);
  if (filters.type === 'due' || filters.type === 'overdue') return dueReport(filters);
  return accountReport(filters);
}

export function createAccountingReportFileName(filters: AccountingReportFilters, extension: 'csv' | 'xlsx') {
  return `finansal-rapor-${filters.type}-${filters.fromDate}-${filters.toDate}.${extension}`;
}

export function buildAccountingReportCsv(report: AccountingReportResult) {
  const lines = [report.columns.map((column) => escapeCsvCell(column.label)).join(';')];
  for (const row of report.rows) lines.push(report.columns.map((column) => escapeCsvCell(row.values[column.key])).join(';'));
  return `\uFEFF${lines.join('\r\n')}`;
}

export async function buildAccountingReportExcel(report: AccountingReportResult, filters: AccountingReportFilters) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'İzniko Yönetim Paneli';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Finansal Rapor', { views: [{ state: 'frozen', ySplit: 4 }] });
  sheet.addRow([report.title]);
  sheet.addRow([`Dönem: ${filters.fromDate} - ${filters.toDate}`]);
  sheet.addRow([`Filtre: ${filters.query || 'Tümü'}`]);
  sheet.addRow(report.columns.map((column) => column.label));
  for (const row of report.rows) {
    sheet.addRow(report.columns.map((column) => {
      const value = row.values[column.key];
      return typeof value === 'string' ? sanitizeSpreadsheetCell(value) : value;
    }));
  }
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
  sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
  report.columns.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1);
    excelColumn.width = column.kind === 'money' ? 18 : column.kind === 'date' ? 16 : 24;
    if (column.kind === 'money') excelColumn.numFmt = '#,##0.00 [$₺-tr-TR]';
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function accountingReportHeaders(fileName: string, excel = false) {
  return attachmentHeaders(fileName, excel
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv; charset=utf-8');
}

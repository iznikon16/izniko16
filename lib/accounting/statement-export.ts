const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type StatementExportParams = {
  customerId: string;
  fromDate: string;
  toDate: string;
};

export type StatementDateRange = Pick<StatementExportParams, 'fromDate' | 'toDate'>;

function isValidISODate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseStatementExportParams(url: URL): StatementExportParams {
  const customerId = url.searchParams.get('customer')?.trim() ?? '';
  const range = parseStatementDateRange(url.searchParams);

  if (!UUID_PATTERN.test(customerId)) throw new Error('Geçerli bir müşteri seçilmelidir.');
  return { customerId, ...range };
}

export function parseStatementDateRange(searchParams: URLSearchParams, defaultFromDate?: string): StatementDateRange {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const fromDate = searchParams.get('from')?.trim() || defaultFromDate || today;
  const toDate = searchParams.get('to')?.trim() || today;

  if (!isValidISODate(fromDate) || !isValidISODate(toDate)) throw new Error('Geçerli bir tarih aralığı seçilmelidir.');
  if (fromDate > toDate) throw new Error('Başlangıç tarihi bitiş tarihinden sonra olamaz.');

  return { fromDate, toDate };
}

export function getStatementDateBounds(fromDate: string, toDate: string) {
  const nextDay = new Date(`${toDate}T12:00:00+03:00`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return {
    fromInclusive: new Date(`${fromDate}T00:00:00+03:00`),
    toExclusive: new Date(`${nextDay.toISOString().slice(0, 10)}T00:00:00+03:00`),
  };
}

/** Prevent spreadsheet programs from interpreting user text as a formula. */
export function sanitizeSpreadsheetCell(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const safe = typeof value === 'string' ? sanitizeSpreadsheetCell(value) : String(value ?? '');
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function createStatementFileName(customerName: string | null | undefined, fromDate: string, toDate: string, extension: string) {
  const slug = (customerName || 'musteri')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLocaleLowerCase('en-US') || 'musteri';
  return `cari-ekstre-${slug}-${fromDate}-${toDate}.${extension}`;
}

export function attachmentHeaders(fileName: string, contentType: string) {
  const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  };
}

export function getStatementCompanyInfo() {
  return {
    name: process.env.COMPANY_NAME?.trim() || 'İzniko Ticaret',
    address: process.env.COMPANY_ADDRESS?.trim() || '',
    phone: process.env.COMPANY_PHONE?.trim() || '',
    taxInfo: process.env.COMPANY_TAX_INFO?.trim() || '',
  };
}

import 'server-only';

import ExcelJS from 'exceljs';
import pdfMake from 'pdfmake';
import robotoFonts from 'pdfmake/fonts/Roboto';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { AccountStatement } from '@/lib/accounting/types';
import { ACCOUNT_TRANSACTION_LABELS } from '@/lib/accounting/types';
import { escapeCsvCell, getStatementCompanyInfo, sanitizeSpreadsheetCell } from '@/lib/accounting/statement-export';

pdfMake.addFonts(robotoFonts);
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((filePath) => /pdfmake[\\/]fonts[\\/]Roboto[\\/]/.test(filePath));

const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
const date = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul' });

export function buildStatementCsv(statement: AccountStatement) {
  const rows: Array<Array<string | number>> = [
    ['Cari Ekstre'],
    ['Müşteri', statement.customer?.full_name || statement.customer?.email || ''],
    ['Cari Kod', statement.accountCode],
    ['Dönem', `${statement.fromDate} - ${statement.toDate}`],
    [],
    ['Tarih', 'İşlem No', 'İşlem Türü', 'Açıklama', 'Vade', 'Borç', 'Alacak', 'Bakiye'],
    [statement.fromDate, '', 'Açılış', 'Devir (Açılış Bakiyesi)', '', 0, 0, statement.openingBalance.toFixed(2)],
  ];

  for (const line of statement.lines) {
    rows.push([
      date.format(new Date(line.date)),
      line.documentNo,
      ACCOUNT_TRANSACTION_LABELS[line.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] ?? line.type,
      line.description,
      line.dueDate || '',
      line.debit.toFixed(2),
      line.credit.toFixed(2),
      line.balanceAfter.toFixed(2),
    ]);
  }
  rows.push([], ['Açılış Bakiyesi', statement.openingBalance.toFixed(2)], ['Toplam Borç', statement.totalDebit.toFixed(2)], ['Toplam Alacak', statement.totalCredit.toFixed(2)], ['Kapanış Bakiyesi', statement.closingBalance.toFixed(2)]);
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n')}`;
}

export async function buildStatementExcel(statement: AccountStatement) {
  const company = getStatementCompanyInfo();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = company.name;
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Cari Ekstre', {
    views: [{ state: 'frozen', ySplit: 7 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = 'CARİ HESAP EKSTRESİ';
  sheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.addRow([company.name]);
  sheet.addRow(['Müşteri', sanitizeSpreadsheetCell(statement.customer?.full_name || statement.customer?.email || ''), '', 'Cari Kod', statement.accountCode]);
  sheet.addRow(['E-posta', sanitizeSpreadsheetCell(statement.customer?.email || ''), '', 'Telefon', sanitizeSpreadsheetCell(statement.customer?.phone || '')]);
  sheet.addRow(['Dönem', `${statement.fromDate} - ${statement.toDate}`]);
  sheet.addRow([]);
  const header = sheet.addRow(['Tarih', 'İşlem No', 'İşlem Türü', 'Açıklama', 'Vade', 'Borç', 'Alacak', 'Bakiye']);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
  sheet.addRow([statement.fromDate, '', 'Açılış', 'Devir (Açılış Bakiyesi)', '', 0, 0, statement.openingBalance]);

  for (const line of statement.lines) {
    sheet.addRow([
      date.format(new Date(line.date)), sanitizeSpreadsheetCell(line.documentNo),
      ACCOUNT_TRANSACTION_LABELS[line.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] ?? line.type,
      sanitizeSpreadsheetCell(line.description), line.dueDate || '', line.debit, line.credit, line.balanceAfter,
    ]);
  }
  sheet.addRow([]);
  sheet.addRow(['Açılış Bakiyesi', statement.openingBalance]);
  sheet.addRow(['Toplam Borç', statement.totalDebit]);
  sheet.addRow(['Toplam Alacak', statement.totalCredit]);
  const closingRow = sheet.addRow(['Kapanış Bakiyesi', statement.closingBalance]);
  closingRow.font = { bold: true };
  sheet.columns = [{ width: 14 }, { width: 22 }, { width: 20 }, { width: 48 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }];
  for (let row = 8; row <= sheet.rowCount; row += 1) {
    for (const column of [6, 7, 8]) sheet.getRow(row).getCell(column).numFmt = '#,##0.00 "₺"';
  }
  sheet.autoFilter = { from: 'A7', to: `H${Math.max(8, 8 + statement.lines.length)}` };
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function buildStatementPdf(statement: AccountStatement) {
  const company = getStatementCompanyInfo();
  const customerName = statement.customer?.full_name || statement.customer?.email || '—';
  const companyLines = [company.name, company.address, company.phone, company.taxInfo].filter(Boolean);
  const tableBody: TableCell[][] = [
    ['Tarih', 'İşlem No', 'İşlem Türü / Açıklama', 'Vade', 'Borç', 'Alacak', 'Bakiye'].map((text) => ({ text, style: 'tableHeader' })),
    [date.format(new Date(`${statement.fromDate}T12:00:00+03:00`)), '—', 'Devir (Açılış Bakiyesi)', '—', '—', '—', money.format(statement.openingBalance)],
    ...statement.lines.map((line) => [
      date.format(new Date(line.date)), line.documentNo,
      `${ACCOUNT_TRANSACTION_LABELS[line.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] ?? line.type}\n${line.description}`,
      line.dueDate ? date.format(new Date(`${line.dueDate}T12:00:00+03:00`)) : '—',
      line.debit > 0 ? money.format(line.debit) : '—', line.credit > 0 ? money.format(line.credit) : '—', money.format(line.balanceAfter),
    ]),
  ];
  const content: Content = [
    { columns: [
      { stack: [{ text: 'CARİ HESAP EKSTRESİ', style: 'title' }, ...companyLines.map((text) => ({ text, style: 'muted' }))] },
      { stack: [{ text: 'Ekstre Dönemi', style: 'label' }, { text: `${date.format(new Date(`${statement.fromDate}T12:00:00+03:00`))} – ${date.format(new Date(`${statement.toDate}T12:00:00+03:00`))}`, alignment: 'right' }], width: 180 },
    ], columnGap: 20 },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 760, y2: 0, lineColor: '#cbd5e1' }], margin: [0, 12, 0, 12] },
    { columns: [
      { stack: [{ text: 'Müşteri', style: 'label' }, { text: customerName, bold: true }, { text: statement.customer?.email || '', style: 'muted' }, { text: statement.customer?.phone || '', style: 'muted' }] },
      { stack: [{ text: 'Cari Kod', style: 'label' }, { text: statement.accountCode, bold: true, alignment: 'right' }], width: 180 },
    ], margin: [0, 0, 0, 12] },
    { columns: [
      { text: `Açılış\n${money.format(statement.openingBalance)}`, style: 'summary' },
      { text: `Toplam Borç\n${money.format(statement.totalDebit)}`, style: 'summary' },
      { text: `Toplam Alacak\n${money.format(statement.totalCredit)}`, style: 'summary' },
      { text: `Kapanış\n${money.format(statement.closingBalance)}`, style: 'summary' },
    ], columnGap: 8, margin: [0, 0, 0, 16] },
    { table: { headerRows: 1, widths: [58, 80, '*', 58, 68, 68, 72], body: tableBody }, layout: 'lightHorizontalLines' },
  ];
  const definition: TDocumentDefinitions = {
    pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [32, 36, 32, 36], defaultStyle: { font: 'Roboto', fontSize: 8, color: '#1f2937' },
    info: { title: `Cari Ekstre - ${customerName}`, author: company.name, subject: `${statement.fromDate} - ${statement.toDate}` }, content,
    footer: (currentPage, pageCount) => ({ text: `${company.name} · ${currentPage}/${pageCount}`, alignment: 'center', color: '#64748b', fontSize: 7, margin: [0, 10, 0, 0] }),
    styles: {
      title: { fontSize: 18, bold: true, color: '#0369a1' }, label: { fontSize: 8, bold: true, color: '#64748b', margin: [0, 0, 0, 3] },
      muted: { fontSize: 8, color: '#64748b' }, summary: { bold: true, fillColor: '#f1f5f9', margin: [8, 7, 8, 7], alignment: 'center' },
      tableHeader: { bold: true, color: '#ffffff', fillColor: '#0284c7', margin: [3, 4, 3, 4] },
    },
  };
  return new Uint8Array(await pdfMake.createPdf(definition).getBuffer());
}

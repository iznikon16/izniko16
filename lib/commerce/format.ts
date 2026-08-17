const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

export function formatCommercePrice(value: number | null | undefined) {
  return currencyFormatter.format(value ?? 0);
}

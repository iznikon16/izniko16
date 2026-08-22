export function parsePageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const safeTotalPages = Math.max(1, Math.trunc(totalPages));
  const safeCurrentPage = Math.min(safeTotalPages, Math.max(1, Math.trunc(currentPage)));
  const pages = new Set<number>([1, safeTotalPages]);

  for (let page = safeCurrentPage - 1; page <= safeCurrentPage + 1; page += 1) {
    if (page >= 1 && page <= safeTotalPages) pages.add(page);
  }

  if (safeCurrentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (safeCurrentPage >= safeTotalPages - 2) {
    pages.add(safeTotalPages - 1);
    pages.add(safeTotalPages - 2);
  }

  return [...pages].filter((page) => page >= 1 && page <= safeTotalPages).sort((left, right) => left - right);
}

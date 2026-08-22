const SENSITIVE_KEY_PATTERN = /(password|passwd|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|client[_-]?secret|encryption)/i;
const REDACTED = '[GİZLENDİ]';

export function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[SINIRLANDI]';
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeAuditValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 100).map(([key, child]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeAuditValue(child, depth + 1),
    ]));
  }
  return String(value);
}

export function sanitizeAuditRecord(value: Record<string, unknown>) {
  return sanitizeAuditValue(value) as Record<string, unknown>;
}

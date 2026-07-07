const ORDERED_FIELD_KEYS = [
  'ts',
  'level',
  'service',
  'context',
  'txId',
  'transactionId',
  'requestId',
  'traceId',
  'userId',
  'memberId',
  'role',
  'method',
  'path',
  'statusCode',
  'durationMs',
  'event',
  'outcome',
  'ids',
  'msg',
  'error',
  'body',
  'stack',
  'pid',
  'ip',
  'userAgent',
  'meta',
] as const;

const FIELD_LABEL_KEYS: Record<string, string> = {
  ts: 'timestamp',
  level: 'level',
  service: 'service',
  context: 'context',
  txId: 'txId',
  transactionId: 'transactionId',
  requestId: 'requestId',
  traceId: 'traceId',
  userId: 'userId',
  memberId: 'memberId',
  role: 'role',
  method: 'method',
  path: 'path',
  statusCode: 'statusCode',
  durationMs: 'durationMs',
  event: 'event',
  outcome: 'outcome',
  ids: 'ids',
  msg: 'message',
  error: 'error',
  body: 'body',
  stack: 'stack',
  pid: 'pid',
  ip: 'ip',
  userAgent: 'userAgent',
  meta: 'meta',
};

export interface ParsedAdminLogField {
  key: string;
  labelKey: string;
  order: number;
  value: unknown;
  formattedValue: string;
}

export interface ParsedAdminLogEntry {
  lineNumber: number;
  raw: string;
  parsed: boolean;
  fields: ParsedAdminLogField[];
  summary: string;
  level?: string;
  timestamp?: string;
}

function extractJsonCandidate(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const jsonStart = trimmed.indexOf('{');
  if (jsonStart < 0) return null;

  const candidate = trimmed.slice(jsonStart);
  return candidate.endsWith('}') ? candidate : null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
}

function buildSummary(record: Record<string, unknown>): string {
  const parts = [
    record.level,
    record.context,
    record.method && record.path
      ? `${record.method} ${record.path}`
      : (record.msg ?? record.message),
    record.statusCode ? `status=${record.statusCode}` : null,
    record.durationMs !== undefined ? `${record.durationMs}ms` : null,
  ].filter(Boolean);

  return parts.map(String).join(' · ') || '-';
}

export function parseAdminLogContent(content: string): ParsedAdminLogEntry[] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => parseAdminLogLine(line, index + 1));
}

export function parseAdminLogLine(line: string, lineNumber: number): ParsedAdminLogEntry {
  const jsonCandidate = extractJsonCandidate(line);
  if (!jsonCandidate) {
    return {
      lineNumber,
      raw: line,
      parsed: false,
      fields: [],
      summary: line,
    };
  }

  try {
    const parsed = JSON.parse(jsonCandidate) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('log line is not an object');
    }

    const record = parsed as Record<string, unknown>;
    const seen = new Set<string>();
    const fields: ParsedAdminLogField[] = [];

    for (const key of ORDERED_FIELD_KEYS) {
      if (!(key in record)) continue;
      seen.add(key);
      fields.push({
        key,
        labelKey: FIELD_LABEL_KEYS[key] ?? 'extra',
        order: fields.length + 1,
        value: record[key],
        formattedValue: formatValue(record[key]),
      });
    }

    for (const [key, value] of Object.entries(record)) {
      if (seen.has(key)) continue;
      fields.push({
        key,
        labelKey: 'extra',
        order: fields.length + 1,
        value,
        formattedValue: formatValue(value),
      });
    }

    return {
      lineNumber,
      raw: line,
      parsed: true,
      fields,
      summary: buildSummary(record),
      level: typeof record.level === 'string' ? record.level : undefined,
      timestamp:
        typeof record.ts === 'string'
          ? record.ts
          : typeof record.timestamp === 'string'
            ? record.timestamp
            : undefined,
    };
  } catch {
    return {
      lineNumber,
      raw: line,
      parsed: false,
      fields: [],
      summary: line,
    };
  }
}

export function getAdminLogField(entry: ParsedAdminLogEntry, keys: readonly string[]): string {
  for (const key of keys) {
    const field = entry.fields.find((item) => item.key === key);
    if (field && field.formattedValue !== '-') {
      return field.formattedValue;
    }
  }
  return '';
}

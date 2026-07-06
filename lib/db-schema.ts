import { q } from '@/lib/db'

const tableColumnsCache = new Map<string, Set<string>>()

export async function getTableColumns(tableName: string): Promise<Set<string>> {
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
    throw new Error(`Nome tabella non valido: ${tableName}`)
  }
  const cached = tableColumnsCache.get(tableName)
  if (cached) return cached

  const rows = await q(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [tableName],
  )
  const columns = new Set(rows.map(row => String(row.column_name)))
  tableColumnsCache.set(tableName, columns)
  return columns
}

export function filterExistingColumnPairs<T>(
  columns: string[],
  values: T[],
  existingColumns: Set<string>,
): { columns: string[]; values: T[]; skipped: string[] } {
  const pairs = columns.map((column, index) => [column, values[index]] as const)
  const kept = pairs.filter(([column]) => existingColumns.has(column))
  return {
    columns: kept.map(([column]) => column),
    values: kept.map(([, value]) => value),
    skipped: pairs.filter(([column]) => !existingColumns.has(column)).map(([column]) => column),
  }
}

export function mediaSlotColumns(max = 10): string[] {
  return Array.from({ length: max }, (_, index) => `link_media_${index + 1}`)
}

export function selectExistingColumns(
  alias: string,
  columns: string[],
  existingColumns: Set<string>,
): string[] {
  return columns.map(column => (
    existingColumns.has(column)
      ? `${alias}.${column}`
      : `NULL::text AS ${column}`
  ))
}

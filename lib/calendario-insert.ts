import { q } from '@/lib/db'
import { getTableColumns, filterExistingColumnPairs } from '@/lib/db-schema'

// Insert schema-safe su `calendario`: introspeziona le colonne reali e scarta
// quelle inesistenti (lo schema varia tra installazioni). È la stessa logica degli
// helper `insertCalendario` inline nelle route di generazione manuale, estratta qui
// per il riuso dagli agenti automatici (che non hanno una req/sessione).
export async function insertCalendarioRow(columns: string[], values: unknown[]): Promise<void> {
  const existing = await getTableColumns('calendario')
  const { columns: finalColumns, values: finalValues } = filterExistingColumnPairs(columns, values, existing)
  if (!finalColumns.length) throw new Error('Nessuna colonna valida per insert su calendario (schema DB inatteso)')
  await q(
    `INSERT INTO calendario (${finalColumns.join(', ')}) VALUES (${finalColumns.map((_, i) => `$${i + 1}`).join(', ')})`,
    finalValues,
  )
}

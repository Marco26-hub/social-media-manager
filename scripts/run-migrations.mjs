#!/usr/bin/env node

import { neon } from '@neondatabase/serverless'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const fileArgIndex = argv.indexOf('--file')
const onlyFile = fileArgIndex >= 0 ? argv[fileArgIndex + 1] : null

if (fileArgIndex >= 0 && !onlyFile) {
  console.error('Uso: npm run migrate -- --file 011_admin_user.sql')
  process.exit(1)
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(rootDir, 'db', 'migrations')

function checksum(content) {
  return createHash('sha256').update(content).digest('hex')
}

function explainTarget(files) {
  const suffix = onlyFile ? ` solo ${onlyFile}` : ''
  console.log(`Migrazioni trovate${suffix}:`)
  for (const file of files) {
    console.log(`- ${file}`)
  }
}

function stripSqlComments(content) {
  return content
    .split('\n')
    .map((line) => line.replace(/--.*$/g, ''))
    .join('\n')
}

function splitSqlStatements(content) {
  const sql = stripSqlComments(content)
  const statements = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let dollarQuoteTag = null

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const next = sql[index + 1]

    if (!inSingleQuote && !inDoubleQuote) {
      if (!dollarQuoteTag && char === '$') {
        const rest = sql.slice(index)
        const match = rest.match(/^\$[A-Za-z0-9_]*\$/)
        if (match) {
          dollarQuoteTag = match[0]
          current += dollarQuoteTag
          index += dollarQuoteTag.length - 1
          continue
        }
      } else if (dollarQuoteTag && sql.startsWith(dollarQuoteTag, index)) {
        current += dollarQuoteTag
        index += dollarQuoteTag.length - 1
        dollarQuoteTag = null
        continue
      }
    }

    if (!dollarQuoteTag && !inDoubleQuote && char === "'" && next === "'") {
      current += char + next
      index += 1
      continue
    }

    if (!dollarQuoteTag && !inDoubleQuote && char === "'") {
      inSingleQuote = !inSingleQuote
      current += char
      continue
    }

    if (!dollarQuoteTag && !inSingleQuote && char === '"') {
      inDoubleQuote = !inDoubleQuote
      current += char
      continue
    }

    if (!dollarQuoteTag && !inSingleQuote && !inDoubleQuote && char === ';') {
      const statement = current.trim()
      if (statement) statements.push(statement)
      current = ''
      continue
    }

    current += char
  }

  const tail = current.trim()
  if (tail) statements.push(tail)
  return statements
}

async function main() {
  const allFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))

  const files = onlyFile ? allFiles.filter((file) => file === onlyFile) : allFiles

  if (files.length === 0) {
    console.error(onlyFile ? `Migration non trovata: ${onlyFile}` : 'Nessuna migration .sql trovata.')
    process.exit(1)
  }

  if (dryRun) {
    explainTarget(files)
    console.log('Dry-run completato: nessuna query eseguita.')
    return
  }

  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    console.error('DATABASE_URL mancante. Impostala prima di eseguire le migrazioni Neon.')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  await sql.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `)

  const appliedRows = await sql`select filename, checksum from schema_migrations`
  const applied = new Map(appliedRows.map((row) => [row.filename, row.checksum]))

  explainTarget(files)

  for (const filename of files) {
    const fullPath = path.join(migrationsDir, filename)
    const content = await readFile(fullPath, 'utf8')
    const hash = checksum(content)
    const existingHash = applied.get(filename)

    if (existingHash) {
      if (existingHash !== hash) {
        throw new Error(
          `Checksum diversa per ${filename}. Non modificare migration già applicate: crea una nuova migration.`
        )
      }

      console.log(`✓ skip ${filename}`)
      continue
    }

    const statements = splitSqlStatements(content)
    console.log(`→ apply ${filename} (${statements.length} statement)`)
    for (const [statementIndex, statement] of statements.entries()) {
      try {
        await sql.query(statement)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`${filename} statement ${statementIndex + 1}/${statements.length}: ${message}`)
      }
    }
    await sql`
      insert into schema_migrations (filename, checksum)
      values (${filename}, ${hash})
    `
    console.log(`✓ applied ${filename}`)
  }

  console.log('Migrazioni completate.')
}

main().catch((error) => {
  console.error('Migrazione fallita:')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

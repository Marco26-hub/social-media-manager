#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const isProduction = process.env.NODE_ENV === 'production'
const hasDatabase = Boolean(process.env.DATABASE_URL?.trim())
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const adminEmail = process.env.ADMIN_EMAIL?.trim() || ''
const adminPassword = process.env.ADMIN_PASSWORD?.trim() || ''

// Gate go-live: in produzione reale (non demo) ADMIN_EMAIL/ADMIN_PASSWORD sono
// OBBLIGATORIE. Senza, ensure-admin lascerebbe attivo il fallback storico
// 'admin'/'1234567' → chiunque conosce le default fa takeover. Blocchiamo l'avvio
// così l'operatore le vede subito nei log Render.
function assertAdminCredentialsIfNeeded() {
  if (!isProduction || isDemoMode || !hasDatabase) return
  const missing = []
  if (!adminEmail) missing.push('ADMIN_EMAIL')
  if (!adminPassword) missing.push('ADMIN_PASSWORD')
  if (adminPassword && adminPassword.length < 8) missing.push('ADMIN_PASSWORD (min 8 char)')
  if (missing.length) {
    console.error(`[render-start] FATAL: env obbligatorie mancanti in produzione: ${missing.join(', ')}.`)
    console.error('[render-start] Setta ADMIN_EMAIL e ADMIN_PASSWORD (>=8 char) nel dashboard Render prima del deploy.')
    process.exit(1)
  }
}

function runMigrationsIfNeeded() {
  if (!hasDatabase) {
    console.log('[render-start] DATABASE_URL assente: salto migrations e avvio in demo/setup mode.')
    return
  }

  console.log('[render-start] DATABASE_URL presente: eseguo migrations Neon prima dello start...')
  const result = spawnSync(process.execPath, ['scripts/run-migrations.mjs'], {
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) {
    const code = typeof result.status === 'number' ? result.status : 1
    console.error(`[render-start] Migrations fallite. Blocco avvio con exit code ${code}.`)
    process.exit(code)
  }

  console.log('[render-start] Migrations completate.')
}

function ensureAdminIfNeeded() {
  if (!hasDatabase) return
  console.log('[render-start] Bootstrap admin da env...')
  const result = spawnSync(process.execPath, ['scripts/ensure-admin.mjs'], {
    stdio: 'inherit',
    env: process.env,
  })
  // In produzione reale (non demo) un fallimento del bootstrap admin è FATALE:
  // resterebbe attivo il fallback 'admin'/'1234567', quindi chiudiamo l'avvio.
  if (result.status !== 0) {
    if (isProduction && !isDemoMode) {
      console.error(`[render-start] FATAL: ensure-admin ha restituito ${result.status}. Non avvio l'app con default admin attivo.`)
      process.exit(2)
    }
    console.warn('[render-start] ensure-admin ha restituito codice non-zero (ignorato in demo/dev).')
  }
}

function startNext() {
  const nextBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next')
  const command = existsSync(nextBin) ? nextBin : 'next'
  const child = spawn(command, ['start'], {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })

  const forwardSignal = (signal) => {
    if (!child.killed) child.kill(signal)
  }

  process.on('SIGTERM', () => forwardSignal('SIGTERM'))
  process.on('SIGINT', () => forwardSignal('SIGINT'))

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })
}

if (!isProduction) {
  console.log('[render-start] NODE_ENV non production: avvio Next senza migrations automatiche.')
} else {
  assertAdminCredentialsIfNeeded()
  runMigrationsIfNeeded()
  ensureAdminIfNeeded()
}

startNext()

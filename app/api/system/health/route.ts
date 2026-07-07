import { NextResponse } from 'next/server'
import { isDemo } from '@/lib/demo'
import { dbReady, q } from '@/lib/db'
import { isR2Configured } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const LATEST_REQUIRED_MIGRATION = '026_preview_token.sql'

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim())
}

async function getDatabaseChecks(enabled: boolean) {
  if (!enabled) {
    return {
      dbConnection: false,
      profilesTable: false,
      adminUser: false,
      migrationsTable: false,
      migrationCount: 0,
      latestMigrationApplied: false,
      error: null,
    }
  }

  try {
    const [connectionRows, schemaRows] = await Promise.all([
      q('SELECT 1 AS ok'),
      q(`SELECT
        to_regclass('public.profiles') IS NOT NULL AS profiles_table,
        to_regclass('public.schema_migrations') IS NOT NULL AS migrations_table`),
    ])

    const schema = schemaRows[0] as Record<string, unknown> | undefined
    const profilesTable = Boolean(schema?.profiles_table)
    const migrationsTable = Boolean(schema?.migrations_table)
    const adminRows = profilesTable
      ? await q(`SELECT EXISTS(SELECT 1 FROM profiles WHERE email = 'admin') AS admin_user`)
      : []
    const migrationRows = migrationsTable
      ? await q(
          `SELECT
            count(*)::int AS migration_count,
            EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1) AS latest_migration_applied
          FROM schema_migrations`,
          [LATEST_REQUIRED_MIGRATION]
        )
      : []
    const admin = adminRows[0] as Record<string, unknown> | undefined
    const migrations = migrationRows[0] as Record<string, unknown> | undefined

    return {
      dbConnection: Boolean((connectionRows[0] as Record<string, unknown> | undefined)?.ok),
      profilesTable,
      adminUser: Boolean(admin?.admin_user),
      migrationsTable,
      migrationCount: Number(migrations?.migration_count || 0),
      latestMigrationApplied: Boolean(migrations?.latest_migration_applied),
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Logga il dettaglio solo server-side; non esporlo nell'endpoint pubblico.
    console.error('[system health] database check failed:', message.slice(0, 500))
    return {
      dbConnection: false,
      profilesTable: false,
      adminUser: false,
      migrationsTable: false,
      migrationCount: 0,
      latestMigrationApplied: false,
      error: 'db_check_failed',
    }
  }
}

export async function GET() {
  const demo = isDemo()
  const hasDatabaseUrl = dbReady()
  const databaseChecks = await getDatabaseChecks(hasDatabaseUrl)
  const checks = {
    databaseUrl: hasDatabaseUrl,
    dbConnection: demo || databaseChecks.dbConnection,
    profilesTable: demo || databaseChecks.profilesTable,
    adminUser: demo || databaseChecks.adminUser,
    migrationsTable: demo || databaseChecks.migrationsTable,
    authSecret: hasEnv('AUTH_SECRET') || hasEnv('NEXTAUTH_SECRET'),
    nextauthUrl: hasEnv('NEXTAUTH_URL'),
    siteUrl: hasEnv('NEXT_PUBLIC_SITE_URL'),
    anthropic: hasEnv('ANTHROPIC_API_KEY'),
    openrouter: hasEnv('OPENROUTER_API_KEY'),
    blotatoApiKey: hasEnv('BLOTATO_API_KEY'),
    blotatoWebhookSecret: hasEnv('BLOTATO_WEBHOOK_SECRET'),
    stripeSecret: hasEnv('STRIPE_SECRET_KEY'),
    stripeWebhook: hasEnv('STRIPE_WEBHOOK_SECRET'),
    publishEnabled: process.env.PUBLISH_ENABLED === 'true',
    r2Storage: isR2Configured(),
  }

  const hasDatabase = demo || (checks.databaseUrl && checks.dbConnection && checks.profilesTable)
  const hasAi = checks.anthropic || checks.openrouter
  const ready = hasDatabase && checks.adminUser && checks.authSecret && checks.nextauthUrl && hasAi

  // Commit SHA del deploy (Render espone RENDER_GIT_COMMIT). Serve a confermare
  // QUALE build è realmente online (i deploy Render tengono su la vecchia istanza
  // finché la nuova non passa l'healthcheck, quindi l'endpoint da solo non basta).
  const version = (process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '').slice(0, 7) || 'unknown'

  // Liveness vs readiness: torniamo 503 SOLO su fallimento CRITICO (in produzione
  // con DATABASE_URL ma DB irraggiungibile o schema mancante) così Render rileva
  // un deploy davvero rotto. Le env opzionali mancanti (Stripe/Blotato/storage)
  // restano 'needs_setup' con HTTP 200: l'app funziona, mancano solo feature — NON
  // vogliamo che l'healthcheck Render bocci il deploy per una key opzionale.
  const criticalFailure = !demo && checks.databaseUrl && (!checks.dbConnection || !checks.profilesTable)
  const httpStatus = criticalFailure ? 503 : 200

  return NextResponse.json({
    status: criticalFailure ? 'unhealthy' : (ready ? 'ready' : 'needs_setup'),
    mode: demo ? 'demo' : 'production',
    version,
    database: 'neon-postgres',
    checked_at: new Date().toISOString(),
    checks,
    database_details: {
      migrationCount: databaseChecks.migrationCount,
      latestRequiredMigration: LATEST_REQUIRED_MIGRATION,
      latestMigrationApplied: databaseChecks.latestMigrationApplied,
      error: databaseChecks.error,
    },
    next_actions: [
      ...(!checks.databaseUrl ? ['Configura DATABASE_URL per Neon/Postgres'] : []),
      ...(checks.databaseUrl && !checks.dbConnection ? ['DATABASE_URL presente ma connessione Neon fallita: verifica stringa/SSL/password'] : []),
      ...(checks.dbConnection && !checks.profilesTable ? ['Esegui migrations Neon: tabella profiles mancante'] : []),
      ...(checks.profilesTable && !checks.adminUser ? ['Esegui db/migrations/011_admin_user.sql: admin mancante'] : []),
      ...(!checks.authSecret ? ['Configura AUTH_SECRET o NEXTAUTH_SECRET'] : []),
      ...(!checks.nextauthUrl ? ['Configura NEXTAUTH_URL con URL Render o dominio custom'] : []),
      ...(!checks.siteUrl ? ['Configura NEXT_PUBLIC_SITE_URL per link e referrer OpenRouter'] : []),
      ...(!hasAi ? ['Aggiungi ANTHROPIC_API_KEY o OPENROUTER_API_KEY'] : []),
      ...(!databaseChecks.latestMigrationApplied ? [`Esegui npm run migrate: manca ${LATEST_REQUIRED_MIGRATION}`] : []),
      ...(!checks.r2Storage ? ['Configura storage S3-compatible (STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_BUCKET, STORAGE_PUBLIC_URL): senza, le immagini caricate spariscono a ogni deploy'] : []),
      ...(!checks.blotatoApiKey ? ['Configura BLOTATO_API_KEY prima di vendere pubblicazione automatica'] : []),
      ...(!checks.blotatoWebhookSecret ? ['Configura BLOTATO_WEBHOOK_SECRET per firmare i callback Blotato'] : []),
      ...(!checks.stripeSecret ? ['Configura STRIPE_SECRET_KEY per checkout/portal pagamenti'] : []),
      ...(!checks.stripeWebhook ? ['Configura STRIPE_WEBHOOK_SECRET per ricevere eventi Stripe'] : []),
      ...(!checks.publishEnabled ? ['PUBLISH_ENABLED non è true: Blotato resta in dry-run globale'] : []),
      ...(checks.blotatoApiKey ? ['Verifica pubblicazione APPROVATO → Blotato/webhook'] : []),
    ],
  }, { status: httpStatus })
}

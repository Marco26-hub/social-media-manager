import { NextResponse } from 'next/server'

// Mappa gli errori noti (lanciati da auth-utils, parsing, ecc.) a status HTTP
// corretti invece del 500 generico. Nessun dettaglio sensibile esposto.
export function apiError(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : 'Errore'

  if (/non autenticato/i.test(msg)) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }
  if (/accesso .*negato|riservat[ao] ad admin/i.test(msg)) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }
  if (/nessun cliente selezionato/i.test(msg)) {
    return NextResponse.json({ error: 'Nessun cliente selezionato' }, { status: 400 })
  }
  // Errori di parsing JSON del body
  if (/JSON|Unexpected token|Expected property/i.test(msg)) {
    return NextResponse.json({ error: 'Richiesta non valida (JSON malformato)' }, { status: 400 })
  }

  // Fallback: NON esporre il messaggio grezzo al client (può contenere nomi
  // colonne/constraint/dettagli driver). Log dettagliato lato server, messaggio
  // generico al client.
  console.error('[apiError] errore non gestito:', msg.slice(0, 500))
  return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
}

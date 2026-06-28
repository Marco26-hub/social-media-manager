import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const searchParams = req.nextUrl.searchParams
    const clienteId = searchParams.get('cliente_id') || 'current-user-client-id'
    const temperature = searchParams.get('temperature')

    let query = supabase
      .from('scraped_leads')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('engagement_score', { ascending: false })

    if (temperature) {
      query = query.eq('temperature', temperature)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

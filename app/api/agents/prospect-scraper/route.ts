import { NextRequest, NextResponse } from 'next/server'
import { executeProspectScraper } from '@/lib/agents/prospect-scraper-agent'

export async function POST(req: NextRequest) {
  try {
    const { clienteId, parameters } = await req.json()

    if (!clienteId || !parameters) {
      return NextResponse.json(
        { error: 'Missing clienteId or parameters' },
        { status: 400 }
      )
    }

    // Execute the scraper
    const result = await executeProspectScraper(clienteId, parameters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Scraper error:', error)
    return NextResponse.json(
      { error: 'Failed to execute scraper' },
      { status: 500 }
    )
  }
}

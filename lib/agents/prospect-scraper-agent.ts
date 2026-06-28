/**
 * PROSPECT SCRAPER AGENT
 * Lead generation from multiple sources
 *
 * Scrapes: LinkedIn, Google Maps, Instagram, Websites
 * Qualifies: CALDO (70-100), TIEPIDO (40-69), FREDDO (0-39)
 * Saves to: scraped_leads table in Neon PostgreSQL
 */

import { q } from '@/lib/db'

export interface ScraperParameters {
  sectors: string[]
  locations: string[]
  company_size: 'micro' | 'small' | 'medium'
  budget_level: 'entry' | 'mid' | 'premium'
  conditions?: string
}

export interface ScrapedLead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  company_name: string
  title?: string
  engagement_score: number
  temperature: 'CALDO' | 'TIEPIDO' | 'FREDDO'
  source: 'LinkedIn' | 'GoogleMaps' | 'Instagram' | 'Website'
  notes?: string
}

export interface ProspectScraperResult {
  execution_id: string
  status: 'completed' | 'failed'
  timestamp: string
  total_leads: number
  breakdown: {
    CALDO: number
    TIEPIDO: number
    FREDDO: number
  }
  leads: ScrapedLead[]
  duration_seconds: number
  simulated?: boolean
  warning?: string
}

class ProspectScraperAgent {
  private clienteId: string

  constructor(clienteId: string) {
    this.clienteId = clienteId
  }

  async execute(params: ScraperParameters): Promise<ProspectScraperResult> {
    const startTime = Date.now()
    const executionId = crypto.randomUUID()

    try {
      console.log(`[${executionId}] Starting prospect scraper for client ${this.clienteId}`)

      // Phase 1: Scrape from all sources (simulated)
      const linkedinLeads = await this.scrapeLinkedin(params)
      const googleMapsLeads = await this.scrapeGoogleMaps(params)
      const instagramLeads = await this.scrapeInstagram(params)

      // Phase 2: Consolidate and deduplicate
      const allLeads = this.consolidateLeads([
        ...linkedinLeads,
        ...googleMapsLeads,
        ...instagramLeads,
      ])

      // Phase 3: Score and qualify
      const scoredLeads = this.scoreLeads(allLeads)

      // Phase 4: Save to database
      const savedLeads = await this.saveToDB(scoredLeads)

      // Phase 5: Return results
      const breakdown = {
        CALDO: savedLeads.filter(l => l.temperature === 'CALDO').length,
        TIEPIDO: savedLeads.filter(l => l.temperature === 'TIEPIDO').length,
        FREDDO: savedLeads.filter(l => l.temperature === 'FREDDO').length,
      }

      const duration = Math.round((Date.now() - startTime) / 1000)

      console.log(`[${executionId}] Completed. Found ${savedLeads.length} leads (${duration}s)`)

      return {
        execution_id: executionId,
        status: 'completed',
        timestamp: new Date().toISOString(),
        total_leads: savedLeads.length,
        breakdown,
        leads: savedLeads,
        duration_seconds: duration,
        // ONESTÀ: i lead sono DIMOSTRATIVI (hardcoded), non scraping reale.
        // Il flag + warning impediscono di scambiarli per contatti veri.
        simulated: true,
        warning: 'DATI DIMOSTRATIVI: lo scraper reale non è ancora attivo. Questi lead sono di esempio, non contatti reali.',
      }
    } catch (error) {
      console.error(`[${executionId}] Error:`, error)
      throw error
    }
  }

  private async scrapeLinkedin(params: ScraperParameters): Promise<ScrapedLead[]> {
    console.log('Scraping LinkedIn...')

    // Simulated LinkedIn scraping
    const leads: ScrapedLead[] = [
      {
        id: crypto.randomUUID(),
        first_name: 'Marco',
        last_name: 'Ferrari',
        email: 'marco@techstoreitalia.com',
        phone: '+39 320 123456',
        company_name: 'TechStore Italia',
        title: 'Founder',
        engagement_score: 78,
        temperature: 'CALDO',
        source: 'LinkedIn',
        notes: 'Posted 8 days ago, active on social',
      },
      {
        id: crypto.randomUUID(),
        first_name: 'Francesca',
        last_name: 'Moretti',
        email: 'francesca@beautyproductshub.it',
        phone: '+39 347 678901',
        company_name: 'Beauty Products Hub',
        title: 'Founder',
        engagement_score: 75,
        temperature: 'CALDO',
        source: 'LinkedIn',
        notes: 'Actively selling, wants to scale',
      },
      {
        id: crypto.randomUUID(),
        first_name: 'Giulia',
        last_name: 'Rossi',
        email: 'giulia.rossi@fashionhubmilano.it',
        phone: '+39 331 789012',
        company_name: 'Fashion Hub Milano',
        title: 'Owner',
        engagement_score: 72,
        temperature: 'CALDO',
        source: 'LinkedIn',
      },
      {
        id: crypto.randomUUID(),
        first_name: 'Andrea',
        last_name: 'Bianchi',
        email: 'andrea@homedecorstore.it',
        phone: '+39 345 456789',
        company_name: 'Home Decor Store',
        title: 'Founder',
        engagement_score: 65,
        temperature: 'TIEPIDO',
        source: 'LinkedIn',
      },
      {
        id: crypto.randomUUID(),
        first_name: 'Luca',
        last_name: 'Gallo',
        email: 'luca@sportsebay.it',
        phone: '+39 333 567890',
        company_name: 'Sports Equipment Online',
        title: 'Business Owner',
        engagement_score: 58,
        temperature: 'TIEPIDO',
        source: 'LinkedIn',
      },
    ]

    return leads
  }

  private async scrapeGoogleMaps(params: ScraperParameters): Promise<ScrapedLead[]> {
    console.log('Scraping Google Maps...')

    const leads: ScrapedLead[] = [
      {
        id: crypto.randomUUID(),
        first_name: '',
        last_name: 'Sales',
        email: 'sales@vintage-collectibles.it',
        phone: '+39 388 333444',
        company_name: 'Vintage Collectibles Store',
        engagement_score: 71,
        temperature: 'CALDO',
        source: 'GoogleMaps',
        notes: 'Active business, recent reviews',
      },
      {
        id: crypto.randomUUID(),
        first_name: '',
        last_name: 'Info',
        email: 'info@sportwear-direct.it',
        phone: '+39 392 111222',
        company_name: 'Sportswear Direct',
        engagement_score: 68,
        temperature: 'TIEPIDO',
        source: 'GoogleMaps',
      },
      {
        id: crypto.randomUUID(),
        first_name: '',
        last_name: 'Support',
        email: 'support@petsupply-hub.it',
        phone: '+39 382 555666',
        company_name: 'Pet Supply Online Hub',
        engagement_score: 52,
        temperature: 'FREDDO',
        source: 'GoogleMaps',
      },
    ]

    return leads
  }

  private async scrapeInstagram(params: ScraperParameters): Promise<ScrapedLead[]> {
    console.log('Scraping Instagram...')

    const leads: ScrapedLead[] = [
      {
        id: crypto.randomUUID(),
        first_name: 'Elena',
        last_name: 'Russo',
        email: 'elena@fashionbrand.it',
        phone: '+39 320 987654',
        company_name: 'Fashion Brand Italia',
        engagement_score: 73,
        temperature: 'CALDO',
        source: 'Instagram',
        notes: 'Growing fashion brand, active posts',
      },
      {
        id: crypto.randomUUID(),
        first_name: 'Carlo',
        last_name: 'Neri',
        email: 'carlo@handmadeshop.it',
        phone: '+39 340 123456',
        company_name: 'Handmade Shop',
        engagement_score: 61,
        temperature: 'TIEPIDO',
        source: 'Instagram',
      },
    ]

    return leads
  }

  private consolidateLeads(allLeads: ScrapedLead[]): ScrapedLead[] {
    // Remove duplicates by email
    const uniqueByEmail = new Map<string, ScrapedLead>()

    for (const lead of allLeads) {
      if (!uniqueByEmail.has(lead.email)) {
        // Marca ogni lead come dimostrativo: identificabile nella lista/DB.
        const tagged = { ...lead, notes: `[DEMO] ${lead.notes || 'lead di esempio'}` }
        uniqueByEmail.set(lead.email, tagged)
      }
    }

    return Array.from(uniqueByEmail.values())
  }

  private scoreLeads(leads: ScrapedLead[]): ScrapedLead[] {
    // Score already assigned during scraping, but could be refined here
    return leads
  }

  private async saveToDB(leads: ScrapedLead[]): Promise<ScrapedLead[]> {
    console.log(`Saving ${leads.length} leads to database...`)

    try {
      // Use Neon SQL directly to insert/upsert leads
      for (const lead of leads) {
        await q(
          `INSERT INTO scraped_leads
            (cliente_id, first_name, last_name, email, phone, company_name, title,
             engagement_score, temperature, source, status, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
           ON CONFLICT (email, cliente_id)
           DO UPDATE SET
             temperature = $9,
             engagement_score = $8,
             updated_at = NOW()`,
          [
            this.clienteId,
            lead.first_name || null,
            lead.last_name || null,
            lead.email,
            lead.phone || null,
            lead.company_name,
            lead.title || null,
            lead.engagement_score,
            lead.temperature,
            lead.source,
            'PENDING',
            lead.notes || null,
          ]
        )
      }

      console.log(`Saved ${leads.length} leads`)
      return leads
    } catch (error) {
      console.error('Database error:', error)
      throw error
    }
  }
}

export async function executeProspectScraper(
  clienteId: string,
  params: ScraperParameters
): Promise<ProspectScraperResult> {
  const agent = new ProspectScraperAgent(clienteId)
  return await agent.execute(params)
}

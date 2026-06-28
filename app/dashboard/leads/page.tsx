'use client'

import { useState, useEffect } from 'react'
import { Mail, Phone, Building2, TrendingUp, Filter, Download } from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'CALDO' | 'TIEPIDO' | 'FREDDO' | 'ALL'>('ALL')
  const [executing, setExecuting] = useState(false)

  useEffect(() => {
    // Load leads from database
    loadLeads()
  }, [filter])

  const loadLeads = async () => {
    setLoading(true)
    try {
      const query = filter === 'ALL' ? '' : `?temperature=${filter}`
      const res = await fetch(`/api/leads${query}`)
      const data = await res.json()
      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeProspectScraper = async () => {
    setExecuting(true)
    try {
      const response = await fetch('/api/agents/prospect-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: 'current-user-client-id', // Replace with actual client ID
          parameters: {
            sectors: ['e-commerce'],
            locations: ['Lombardia'],
            company_size: 'micro',
            budget_level: 'entry',
            conditions: 'website_no_social',
          },
        }),
      })

      const result = await response.json()
      console.log('Scraper result:', result)

      // Reload leads
      await loadLeads()
      alert(`✅ Found ${result.total_leads} leads!\n\nCALDO: ${result.breakdown.CALDO}\nTIEPIDO: ${result.breakdown.TIEPIDO}\nFREDDO: ${result.breakdown.FREDDO}`)
    } catch (error) {
      console.error('Error executing scraper:', error)
      alert('❌ Error executing scraper')
    } finally {
      setExecuting(false)
    }
  }

  const getTemperatureColor = (temp: string) => {
    switch (temp) {
      case 'CALDO': return 'bg-red-100 text-red-800'
      case 'TIEPIDO': return 'bg-yellow-100 text-yellow-800'
      case 'FREDDO': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'LinkedIn': return '💼'
      case 'GoogleMaps': return '📍'
      case 'Instagram': return '📸'
      case 'Website': return '🌐'
      default: return '📧'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Generation</h1>
          <p className="text-gray-600 mt-1">40-50 qualified leads per week from 7 sources</p>
        </div>
        <button
          onClick={executeProspectScraper}
          disabled={executing}
          className="btn-primary"
        >
          🚀 {executing ? 'Scraping...' : 'Run Prospect Scraper'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-600 font-medium">Total Leads</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{leads.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600 font-medium">🔴 CALDO (Hot)</div>
          <div className="text-3xl font-bold text-red-600 mt-1">{leads.filter(l => l.temperature === 'CALDO').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600 font-medium">🟡 TIEPIDO (Warm)</div>
          <div className="text-3xl font-bold text-yellow-600 mt-1">{leads.filter(l => l.temperature === 'TIEPIDO').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600 font-medium">🔵 FREDDO (Cold)</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{leads.filter(l => l.temperature === 'FREDDO').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-600" />
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('CALDO')}
          className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'CALDO' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          🔴 CALDO
        </button>
        <button
          onClick={() => setFilter('TIEPIDO')}
          className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'TIEPIDO' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          🟡 TIEPIDO
        </button>
        <button
          onClick={() => setFilter('FREDDO')}
          className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'FREDDO' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          🔵 FREDDO
        </button>
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p className="mb-4">No leads found. Click "Run Prospect Scraper" to get started.</p>
            <button onClick={executeProspectScraper} className="btn-primary">
              🚀 Run Scraper Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Company</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Score</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Temperature</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Source</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Building2 className="w-4 h-4" />
                        {lead.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
                      >
                        <Mail className="w-4 h-4" />
                        {lead.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                        >
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-brand-600" />
                        <span className="font-medium text-gray-900">{lead.engagement_score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTemperatureColor(lead.temperature)}`}>
                        {lead.temperature}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-lg">{getSourceIcon(lead.source)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-brand-600 hover:text-brand-700 font-medium">
                        Contact
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

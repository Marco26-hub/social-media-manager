import { Users, Plus, Briefcase } from 'lucide-react'

export const dynamic = 'force-dynamic'

const demoClienti = [
  { id: 'c1', nome: 'Brand Fashion Demo',  settore: 'Abbigliamento', email: 'info@brand.com',     telefono: '+39 339 1234567', piano: 'Pro',  contenuti_mese: 30, attivo: true },
  { id: 'c2', nome: 'Negozio Sport SRL',   settore: 'Sport',         email: 'marketing@sport.it', telefono: '+39 348 9876543', piano: 'Free', contenuti_mese: 7,  attivo: true },
]

export default function ClientiPage() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Clienti</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Brand che gestisci · {demoClienti.length} attivi</p>
        </div>
        <button className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">Nuovo cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {demoClienti.map(c => (
          <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{c.nome}</h3>
                <p className="text-xs text-gray-500">{c.settore}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                c.piano === 'Pro' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
              }`}>{c.piano}</span>
            </div>

            <div className="space-y-1.5 text-xs text-gray-600 mb-4">
              <p>📧 {c.email}</p>
              <p>📞 {c.telefono}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Contenuti / mese</p>
                <p className="text-xl font-bold text-gray-900">{c.contenuti_mese}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                c.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {c.attivo ? 'Attivo' : 'Inattivo'}
              </span>
            </div>
          </div>
        ))}

        {/* Add card */}
        <button className="card p-5 border-dashed border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors flex flex-col items-center justify-center text-center min-h-[200px]">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
            <Plus className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">Aggiungi cliente</p>
          <p className="text-xs text-gray-400 mt-0.5">Onboard nuovo brand</p>
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-6 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        Demo: tabella <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">clienti</code> in Supabase (da creare con migration 003)
      </p>
    </div>
  )
}

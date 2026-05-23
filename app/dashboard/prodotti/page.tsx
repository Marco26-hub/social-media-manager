import { createClient } from '@/lib/supabase/server'
import type { Prodotto } from '@/lib/types'
import { demoProdotti } from '@/lib/demo-data'

export const dynamic = 'force-dynamic'

const isDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export default async function ProdottiPage() {
  let prodotti
  if (isDemo()) {
    prodotti = demoProdotti
  } else {
    const supabase = await createClient()
    const res = await supabase.from('prodotti').select('*').order('priorita', { ascending: true })
    prodotti = res.data
  }

  const stockColor: Record<string, string> = {
    disponibile: 'text-green-700 bg-green-50',
    esaurito:    'text-red-700 bg-red-50',
    in_arrivo:   'text-yellow-700 bg-yellow-50',
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Prodotti</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-0.5">{prodotti?.length ?? 0} prodotti nel catalogo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {(prodotti ?? []).map((p: Prodotto) => (
          <div key={p.id} className="card p-4">
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                {p.link_img_1 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.link_img_1} alt={p.nome_prodotto} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">👕</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm text-gray-900 truncate">{p.nome_prodotto}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    p.prodotto_attivo === 'SI' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.prodotto_attivo === 'SI' ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p.product_id} · {p.categoria}</p>
                <div className="flex items-center gap-2 mt-2">
                  {p.prezzo && <span className="text-sm font-semibold text-gray-800">€{p.prezzo}</span>}
                  {p.prezzo_promo && <span className="text-xs text-red-600 line-through">€{p.prezzo_promo}</span>}
                  {p.stock_status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${stockColor[p.stock_status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.stock_status.replace('_',' ')}
                      {p.stock_quantity != null ? ` (${p.stock_quantity})` : ''}
                    </span>
                  )}
                </div>
                {p.priorita && (
                  <p className="text-xs text-gray-400 mt-1">Priorità: {p.priorita}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!prodotti || prodotti.length === 0) && (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-lg">Nessun prodotto</p>
          <p className="text-sm mt-1">Importa i prodotti dalla migrazione CSV</p>
        </div>
      )}
    </div>
  )
}

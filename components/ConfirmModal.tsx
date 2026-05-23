'use client'
import { X, Sparkles, AlertCircle, Coins } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  desc: string
  modello: string
  isFree: boolean
  tokenEstimate: { input: number; output: number; cost: string }
  running: boolean
}

export default function ConfirmModal({ open, onClose, onConfirm, title, desc, modello, isFree, tokenEstimate, running }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" disabled={running}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-700">{desc}</p>

          {/* Modello */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Modello AI</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{modello}</p>
            </div>
            {isFree && <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">FREE</span>}
          </div>

          {/* Token estimate */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Coins className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-amber-900">
                <p className="font-semibold mb-1">Stima costo</p>
                <div className="space-y-0.5 font-mono">
                  <p>Input: ~{tokenEstimate.input.toLocaleString()} token</p>
                  <p>Output: ~{tokenEstimate.output.toLocaleString()} token</p>
                  <p className="font-bold mt-1">Costo stimato: {tokenEstimate.cost}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>L&apos;AI verrà chiamata solo dopo conferma. Puoi annullare ora senza costi.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} disabled={running} className="flex-1 btn-secondary justify-center">
            Annulla
          </button>
          <button onClick={onConfirm} disabled={running} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            {running ? 'Avvio...' : 'Conferma e genera'}
          </button>
        </div>
      </div>
    </div>
  )
}

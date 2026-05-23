'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLATFORM_LIST } from '@/lib/social-config'
import {
  LayoutDashboard, Calendar, FileText, Settings,
  Package, LogOut, Zap, Menu, X, Search, Target,
  Users, BarChart3
} from 'lucide-react'

type NavItem = { href: string; label: string; icon?: React.ElementType; emoji?: string }
type NavSection = { title: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  {
    title: '',
    items: [
      { href: '/dashboard',            label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    ],
  },
  {
    title: 'SOCIAL',
    items: PLATFORM_LIST.map(p => ({
      href: `/dashboard/social/${p.key}`,
      label: p.nome,
      emoji: p.emoji,
    })),
  },
  {
    title: 'STRUMENTI',
    items: [
      { href: '/dashboard/piano',  label: 'Piano editoriale', icon: Target },
      { href: '/dashboard/seo',    label: 'SEO + GEO Audit',  icon: Search },
      { href: '/dashboard/log',    label: 'Log + Report',     icon: BarChart3 },
    ],
  },
  {
    title: 'GESTIONE',
    items: [
      { href: '/dashboard/clienti',  label: 'Clienti',       icon: Users },
      { href: '/dashboard/prodotti', label: 'Prodotti',      icon: Package },
      { href: '/dashboard/settings', label: 'Impostazioni',  icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-sidebar text-white flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">Social Admin</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2 -mr-2" aria-label="Apri menu">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar drawer */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 md:z-auto
        h-screen w-64 md:w-60 bg-sidebar flex flex-col flex-shrink-0
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Social Admin</span>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav con sezioni */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {SECTIONS.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 px-3">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-brand-600 text-white font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {item.emoji ? (
                        <span className="w-4 text-center text-base leading-none">{item.emoji}</span>
                      ) : Icon ? (
                        <Icon className="w-4 h-4 flex-shrink-0" />
                      ) : null}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </aside>
    </>
  )
}

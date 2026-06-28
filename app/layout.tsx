import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Social Automation V2 — Lead Gen + Content + SEO + ADS',
  description: '6 AI agenti per crescita automatica: lead generation, content creation, SEO analysis, ADS optimization, competitor tracking, weekly reports. ROI 435% in month 1.',
  openGraph: {
    title: 'Social Automation V2',
    description: 'Lead generation, content, SEO, ADS — tutto automatico. €799/mese. Prova gratis 14 giorni.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'
import JsonLd from '@/components/JsonLd'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  metadataBase: new URL('https://social-media-manager-zte4.onrender.com'),
  title: 'Social Automation | Social, siti e visibilità AI per agenzie e PMI',
  description:
    'Gestione social con AI, siti ed e-commerce e visibilità su Google e sugli assistenti AI (SEO e GEO) per agenzie e PMI italiane. Approvazione umana prima di ogni pubblicazione. In arrivo: receptionist AI 24/7 e automazione aziendale.',
  keywords: [
    'automazione AI business',
    'agenti AI',
    'receptionist AI',
    'siti web e e-commerce AI',
    'social media management',
    'social media AI',
    'gestione social con intelligenza artificiale',
    'automazione social',
    'piano editoriale',
    'creazione contenuti social',
    'audit SEO',
    'GEO',
    'lead generation',
    'agenzie',
    'PMI',
  ],
  authors: [{ name: 'Social Automation' }],
  openGraph: {
    title: 'Social Automation | Social, siti e visibilità AI per agenzie e PMI',
    description:
      'Gestione social con AI, siti ed e-commerce e visibilità su Google e sugli assistenti AI (SEO e GEO). Approvazione umana prima di ogni pubblicazione.',
    type: 'website',
    url: 'https://social-media-manager-zte4.onrender.com',
    siteName: 'Social Automation',
    locale: 'it_IT',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Social Automation — automazione AI, siti e social per agenzie e PMI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Social Automation | Social, siti e visibilità AI per agenzie e PMI',
    description:
      'Gestione social con AI, siti ed e-commerce e visibilità su Google e sugli assistenti AI (SEO e GEO). Approvazione umana prima di ogni pubblicazione.',
    images: ['/og.png'],
  },
  alternates: {
    canonical: 'https://social-media-manager-zte4.onrender.com',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <JsonLd />
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}

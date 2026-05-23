// Config centrale per ogni piattaforma social
import type { LucideIcon } from 'lucide-react'
import { Square, Layers, Film, Clock, Video, Pin, FileText } from 'lucide-react'

export type PlatformKey = 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'linkedin' | 'youtube' | 'blog'

export type FormatoConfig = {
  id: string
  nome: string
  desc: string
  icon: LucideIcon
  workflow: string
  formato: string
  aspectRatio: string
  esempio: string
}

export type PlatformConfig = {
  key: PlatformKey
  nome: string
  emoji: string
  colorBg: string
  colorTxt: string
  gradient: string
  tagline: string
  descrizione: string
  canaleDb: string
  formati: FormatoConfig[]
}

export const PLATFORMS: Record<PlatformKey, PlatformConfig> = {
  instagram: {
    key: 'instagram',
    nome: 'Instagram',
    emoji: '📸',
    colorBg: 'bg-gradient-to-br from-pink-500 to-purple-600',
    colorTxt: 'text-pink-600',
    gradient: 'from-pink-50 via-rose-50 to-purple-50',
    tagline: 'Post, caroselli, reel e story',
    descrizione: 'Crea contenuti per il tuo profilo Instagram. Foto, video verticali, storie 24h e caroselli swipe.',
    canaleDb: 'instagram',
    formati: [
      { id: 'IG-POST',  nome: 'Post',     desc: 'Foto singola 1:1 con caption + hashtag',     icon: Square, workflow: 'SOCIAL_B', formato: 'post',     aspectRatio: '1:1',  esempio: 'Mostra il prodotto in primo piano' },
      { id: 'IG-CAR',   nome: 'Carosello',desc: '5-7 slide hook + styling + CTA',             icon: Layers, workflow: 'SOCIAL_D', formato: 'carousel', aspectRatio: '1:1',  esempio: '5 modi di portare i jeans' },
      { id: 'IG-REEL',  nome: 'Reel',     desc: 'Video verticale 9:16 da 15-30 secondi',      icon: Film,   workflow: 'SOCIAL_E', formato: 'reel',     aspectRatio: '9:16', esempio: 'Tutorial styling rapido' },
      { id: 'IG-STORY', nome: 'Story',    desc: 'Story 24h verticale con sticker e swipe up', icon: Clock,  workflow: 'SOCIAL_B', formato: 'story',    aspectRatio: '9:16', esempio: 'Behind the scenes giornata' },
    ],
  },
  facebook: {
    key: 'facebook',
    nome: 'Facebook',
    emoji: '🔵',
    colorBg: 'bg-gradient-to-br from-blue-500 to-blue-700',
    colorTxt: 'text-blue-600',
    gradient: 'from-blue-50 via-sky-50 to-indigo-50',
    tagline: 'Pagina business e community',
    descrizione: 'Pubblica sulla pagina aziendale Facebook. Post landscape, album, video native e reel.',
    canaleDb: 'facebook',
    formati: [
      { id: 'FB-POST', nome: 'Post',      desc: 'Post landscape con CTA',                     icon: Square, workflow: 'SOCIAL_B', formato: 'post',     aspectRatio: '1.91:1', esempio: 'Promo settimanale prodotto top' },
      { id: 'FB-CAR',  nome: 'Carosello', desc: 'Album multi-immagine con descrizioni',       icon: Layers, workflow: 'SOCIAL_D', formato: 'carousel', aspectRatio: '1:1',    esempio: 'Collezione completa' },
      { id: 'FB-VID',  nome: 'Video',     desc: 'Video native landscape 16:9',                icon: Video,  workflow: 'SOCIAL_E', formato: 'video',    aspectRatio: '16:9',   esempio: 'Storia del brand' },
      { id: 'FB-REEL', nome: 'Reel',      desc: 'Reel verticale cross-post da Instagram',     icon: Film,   workflow: 'SOCIAL_E', formato: 'reel',     aspectRatio: '9:16',   esempio: 'Tutorial breve' },
    ],
  },
  tiktok: {
    key: 'tiktok',
    nome: 'TikTok',
    emoji: '🎵',
    colorBg: 'bg-gradient-to-br from-gray-800 to-black',
    colorTxt: 'text-gray-900',
    gradient: 'from-gray-50 via-zinc-50 to-slate-50',
    tagline: 'Video virali e trend',
    descrizione: 'Crea video TikTok 9:16 con audio trending, hashtag virali e hook potenti nei primi 2 secondi.',
    canaleDb: 'tiktok',
    formati: [
      { id: 'TT-VID',  nome: 'Video',     desc: 'Video 9:16 con trending audio',              icon: Video,  workflow: 'SOCIAL_E', formato: 'video', aspectRatio: '9:16', esempio: 'POV: hai trovato il jeans perfetto' },
      { id: 'TT-REEL', nome: 'Reel',      desc: 'Script 15-30s con hook 0-2s',                icon: Film,   workflow: 'SOCIAL_E', formato: 'reel',  aspectRatio: '9:16', esempio: 'Get ready with me' },
    ],
  },
  pinterest: {
    key: 'pinterest',
    nome: 'Pinterest',
    emoji: '📌',
    colorBg: 'bg-gradient-to-br from-red-500 to-red-700',
    colorTxt: 'text-red-600',
    gradient: 'from-red-50 via-rose-50 to-pink-50',
    tagline: 'Pin verticali e idee',
    descrizione: 'Pin verticali 2:3 con link diretto al prodotto. SEO-friendly per essere trovati su Pinterest search.',
    canaleDb: 'pinterest',
    formati: [
      { id: 'PIN-PIN', nome: 'Pin',       desc: 'Pin verticale 2:3 + link prodotto',          icon: Pin,    workflow: 'SOCIAL_B', formato: 'pin', aspectRatio: '2:3', esempio: 'Outfit estate sostenibile' },
    ],
  },
  linkedin: {
    key: 'linkedin',
    nome: 'LinkedIn',
    emoji: '💼',
    colorBg: 'bg-gradient-to-br from-blue-700 to-blue-900',
    colorTxt: 'text-blue-800',
    gradient: 'from-sky-50 via-blue-50 to-indigo-50',
    tagline: 'B2B e thought leadership',
    descrizione: 'Post professionali e articoli lunghi per il pubblico business. Tono autoritativo, insight di settore.',
    canaleDb: 'linkedin',
    formati: [
      { id: 'LI-POST', nome: 'Post',      desc: 'Post B2B con hook + insight settore',        icon: Square,   workflow: 'SOCIAL_B', formato: 'post',     aspectRatio: '1:1',    esempio: 'Trend fashion 2026 nel B2B' },
      { id: 'LI-ART',  nome: 'Articolo',  desc: 'Articolo lungo thought leadership',          icon: FileText, workflow: 'SOCIAL_G', formato: 'articolo', aspectRatio: '16:9',   esempio: 'Come stiamo innovando la filiera' },
    ],
  },
  youtube: {
    key: 'youtube',
    nome: 'YouTube Shorts',
    emoji: '▶️',
    colorBg: 'bg-gradient-to-br from-red-600 to-red-800',
    colorTxt: 'text-red-700',
    gradient: 'from-red-50 via-rose-50 to-orange-50',
    tagline: 'Video corti verticali',
    descrizione: 'Short verticali 9:16 fino a 60 secondi con descrizione SEO e tag ottimizzati per la search YouTube.',
    canaleDb: 'youtube_shorts',
    formati: [
      { id: 'YT-SHORT', nome: 'Short',    desc: 'Video corto 9:16 + descrizione SEO',         icon: Film,   workflow: 'SOCIAL_E', formato: 'short', aspectRatio: '9:16', esempio: 'Outfit del giorno' },
    ],
  },
  blog: {
    key: 'blog',
    nome: 'Blog',
    emoji: '✍️',
    colorBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    colorTxt: 'text-amber-700',
    gradient: 'from-amber-50 via-yellow-50 to-orange-50',
    tagline: 'SEO + GEO articoli lunghi',
    descrizione: 'Articoli blog 800-1200 parole ottimizzati per SEO e GEO (citabilità AI engines come ChatGPT, Perplexity).',
    canaleDb: 'blog',
    formati: [
      { id: 'BLOG-ART', nome: 'Articolo', desc: '800-1200 parole + FAQ schema',               icon: FileText, workflow: 'SOCIAL_G', formato: 'articolo', aspectRatio: '16:9', esempio: 'Come abbinare il blazer in lino' },
    ],
  },
}

export const PLATFORM_LIST = Object.values(PLATFORMS)

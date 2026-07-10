// CSP pragmatica. NB: 'unsafe-inline' su script-src resta NECESSARIO perché le
// pagine sono per lo più statiche/prerenderizzate e il bootstrap inline di Next su
// una pagina statica non può ricevere un nonce per-richiesta (il nonce forzerebbe
// il rendering dinamico di tutta l'app — regressione SEO/perf). Abbiamo però tolto
// 'unsafe-eval': il client Next in produzione non usa eval/new Function, quindi
// rimuoverlo chiude il vettore di code-generation-from-string senza rompere nulla.
// 'self' per connect (le chiamate AI sono proxate dal server). blob:/data: per le
// preview immagini caricate.
// 'unsafe-eval' SOLO in sviluppo: il bundle di `next dev` avvolge ogni modulo in
// eval() (webpack devtool eval-source-map) e senza il browser rifiuta di eseguirlo
// -> boot client e HMR rotti (e la verifica visiva Playwright). In produzione Next
// NON usa eval a runtime, quindi resta fuori (hardening).
const isDev = process.env.NODE_ENV !== 'production'
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://drive.google.com https://lh3.googleusercontent.com https://images.unsplash.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig

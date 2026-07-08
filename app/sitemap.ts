import type { MetadataRoute } from 'next'

const SITE_URL = 'https://social-media-manager-zte4.onrender.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/servizi`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cookie-policy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/termini`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/trasparenza-ai`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
  ]
}

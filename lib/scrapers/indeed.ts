import { XMLParser } from 'fast-xml-parser'
import type { Job, JobSource } from '@/types'

const INDEED_RSS_QUERIES = [
  { q: 'videographer', label: 'Videographer' },
  { q: 'video+editor', label: 'Video Editor' },
  { q: 'video+producer', label: 'Video Producer' },
  { q: 'cinematographer', label: 'Cinematographer' },
  { q: 'motion+graphics', label: 'Motion Graphics' },
  { q: 'animator', label: 'Animator' },
  { q: 'film+editor', label: 'Film Editor' },
  { q: 'creative+producer', label: 'Creative Producer' },
  { q: 'production+coordinator', label: 'Production Coordinator' },
  { q: 'content+creator', label: 'Content Creator' },
  { q: 'creative+director', label: 'Creative Director' },
  { q: 'media+production', label: 'Media Production' },
  { q: 'post+production', label: 'Post Production' },
  { q: 'video+content', label: 'Video Content' },
  { q: 'film+production', label: 'Film Production' },
]

interface RSSItem {
  title: string
  link: string
  description?: string
  pubDate?: string
  source?: { '#text'?: string; _name?: string }
  guid?: string | { '#text': string }
}

interface RSSFeed {
  rss?: { channel?: { item?: RSSItem | RSSItem[] } }
}

async function fetchIndeedRSS(q: string): Promise<RSSItem[]> {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '_' })
  const url = `https://www.indeed.com/rss?q=${q}&l=Dubai%2C+UAE&radius=25&sort=date`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobAggregator/1.0; personal use)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const xml = await res.text()
  const feed: RSSFeed = parser.parse(xml)
  const items = feed.rss?.channel?.item
  return Array.isArray(items) ? items : items ? [items] : []
}

export async function scrapeIndeedRSS(): Promise<Omit<Job, 'id' | 'scraped_at'>[]> {
  const allJobs: Omit<Job, 'id' | 'scraped_at'>[] = []
  const seen = new Set<string>()

  // Run all queries in parallel batches of 5
  for (let i = 0; i < INDEED_RSS_QUERIES.length; i += 5) {
    const batch = INDEED_RSS_QUERIES.slice(i, i + 5)
    const settled = await Promise.allSettled(batch.map(({ q }) => fetchIndeedRSS(q)))

    for (const result of settled) {
      if (result.status !== 'fulfilled') continue
      for (const item of result.value) {
        const link = typeof item.link === 'string' ? item.link : String(item.link ?? '')
        const guid = typeof item.guid === 'string' ? item.guid : item.guid?.['#text'] ?? link

        if (seen.has(guid)) continue
        seen.add(guid)

        const rawDesc = item.description ?? ''
        const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

        const titleParts = (item.title ?? '').split(' - ')
        const title = titleParts[0]?.trim() ?? item.title
        const company =
          titleParts.length > 1 ? titleParts[titleParts.length - 1]?.trim() : undefined

        allJobs.push({
          external_id: guid,
          source: 'indeed_rss' as JobSource,
          title,
          company,
          location: 'Dubai, UAE',
          description,
          job_url: link,
          posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
          is_active: true,
        })
      }
    }
  }

  return allJobs
}

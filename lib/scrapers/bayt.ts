import * as cheerio from 'cheerio'
import type { Job, JobSource } from '@/types'

// Respectful scraping: single page, proper headers, no loops
const BAYT_SEARCH_URL =
  'https://www.bayt.com/en/uae/jobs/video-editor-jobs/?filters[country_id][0]=1&filters[city_id][0]=8'
// Video/media production jobs in Dubai

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

export async function scrapesBayt(): Promise<
  Omit<Job, 'id' | 'scraped_at'>[]
> {
  try {
    const res = await fetch(BAYT_SEARCH_URL, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      console.warn(`Bayt returned ${res.status}`)
      return []
    }

    const html = await res.text()
    const $ = cheerio.load(html)
    const jobs: Omit<Job, 'id' | 'scraped_at'>[] = []

    // Bayt job listing selectors (may need updating if they change HTML)
    $('[data-job-id], li[class*="has-pointer-d"]').each((_, el) => {
      const $el = $(el)
      const jobId =
        $el.attr('data-job-id') ||
        $el.find('[data-job-id]').first().attr('data-job-id')

      if (!jobId) return

      const titleEl = $el.find('h2 a, [class*="jb-title"] a').first()
      const title = titleEl.text().trim()
      if (!title) return

      const relLink = titleEl.attr('href') ?? ''
      const jobUrl = relLink.startsWith('http')
        ? relLink
        : `https://www.bayt.com${relLink}`

      const company =
        $el.find('[class*="jb-company"], [itemprop="hiringOrganization"]').first().text().trim() ||
        undefined

      const location =
        $el.find('[class*="jb-loc"], [class*="location"]').first().text().trim() ||
        'Dubai, UAE'

      const salaryText =
        $el.find('[class*="salary"]').first().text().trim() || undefined

      const postedText =
        $el.find('[class*="date"], time').first().text().trim()
      const posted_at = postedText
        ? parseRelativeDate(postedText)
        : undefined

      jobs.push({
        external_id: `bayt_${jobId}`,
        source: 'bayt' as JobSource,
        title,
        company,
        location,
        job_url: jobUrl,
        salary_range: salaryText,
        posted_at,
        is_active: true,
      })
    })

    return jobs
  } catch (err) {
    console.error('Bayt scrape error:', err)
    return []
  }
}

function parseRelativeDate(text: string): string | undefined {
  const now = new Date()
  const t = text.toLowerCase()
  if (t.includes('today') || t.includes('just now')) return now.toISOString()
  if (t.includes('yesterday')) {
    now.setDate(now.getDate() - 1)
    return now.toISOString()
  }
  const days = t.match(/(\d+)\s*day/)
  if (days) {
    now.setDate(now.getDate() - parseInt(days[1]))
    return now.toISOString()
  }
  return undefined
}

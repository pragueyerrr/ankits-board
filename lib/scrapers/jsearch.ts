import type { Job, JobSource } from '@/types'

const JSEARCH_BASE = 'https://jsearch.p.rapidapi.com/search'

const CREATIVE_QUERIES = [
  'videographer Dubai',
  'video editor Dubai',
  'video producer Dubai',
  'cinematographer Dubai',
  'motion graphics designer Dubai',
  'creative producer Dubai',
  'film editor Dubai',
  'VFX artist Dubai',
]

interface JSearchJob {
  job_id: string
  job_title: string
  employer_name: string
  job_city: string
  job_country: string
  job_description: string
  job_apply_link: string
  job_employment_type: string
  job_salary_currency?: string
  job_min_salary?: number
  job_max_salary?: number
  job_posted_at_datetime_utc?: string
}

interface JSearchResponse {
  data: JSearchJob[]
}

async function fetchJSearchQuery(query: string, apiKey: string): Promise<JSearchJob[]> {
  const params = new URLSearchParams({ query, page: '1', num_pages: '1', date_posted: 'month' })
  const res = await fetch(`${JSEARCH_BASE}?${params}`, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    console.warn(`JSearch API error ${res.status} for query: ${query}`)
    return []
  }
  const data: JSearchResponse = await res.json()
  return data.data ?? []
}

export async function scrapeJSearch(): Promise<Omit<Job, 'id' | 'scraped_at'>[]> {
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) {
    console.warn('JSEARCH_API_KEY missing — skipping JSearch')
    return []
  }
  console.log(`JSearch using key: ${apiKey.slice(0, 8)}...`)

  const allJobs: Omit<Job, 'id' | 'scraped_at'>[] = []
  const seen = new Set<string>()

  // Run queries sequentially with delay to respect 1 req/sec rate limit
  for (const q of CREATIVE_QUERIES) {
    await new Promise((r) => setTimeout(r, 1200))
    const jobs = await fetchJSearchQuery(q, apiKey).catch((err) => {
      console.error(`JSearch error for "${q}":`, err)
      return []
    })
    const settled = [{ status: 'fulfilled' as const, value: jobs }]

    for (const result of settled) {
      if (result.status !== 'fulfilled') continue
      for (const job of result.value) {
        if (seen.has(job.job_id)) continue

        const country = (job.job_country ?? '').toLowerCase()
        const city = (job.job_city ?? '').toLowerCase()
        if (!country.includes('ae') && !country.includes('arab') && !city.includes('dubai')) {
          continue
        }

        seen.add(job.job_id)

        let salaryRange: string | undefined
        if (job.job_min_salary && job.job_max_salary) {
          salaryRange = `${job.job_salary_currency ?? 'AED'} ${Math.round(job.job_min_salary).toLocaleString()} – ${Math.round(job.job_max_salary).toLocaleString()}`
        }

        allJobs.push({
          external_id: job.job_id,
          source: 'manual' as JobSource,
          title: job.job_title,
          company: job.employer_name,
          location: [job.job_city, job.job_country].filter(Boolean).join(', ') || 'Dubai, UAE',
          description: job.job_description?.slice(0, 2000),
          job_url: job.job_apply_link,
          job_type: job.job_employment_type,
          salary_range: salaryRange,
          posted_at: job.job_posted_at_datetime_utc,
          is_active: true,
          raw_data: { jsearch: true },
        })
      }
    }
  }

  return allJobs
}

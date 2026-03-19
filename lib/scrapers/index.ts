import { scrapeAdzuna } from './adzuna'
import { scrapeIndeedRSS } from './indeed'
import { scrapesBayt } from './bayt'
import { scrapeEmployerSites } from './employers'
import { scrapeJSearch } from './jsearch'
import { getCached, setCached, cacheKeys, CACHE_TTL } from '@/lib/redis'
import { createAdminClient } from '@/lib/supabase'
import type { Job } from '@/types'

export interface ScrapeResult {
  inserted: number
  skipped: number
  errors: string[]
  sources: string[]
}

export async function scrapeAllSources(force = false): Promise<ScrapeResult> {
  const result: ScrapeResult = { inserted: 0, skipped: 0, errors: [], sources: [] }

  const cacheKey = cacheKeys.jobsList('all', 'video_dubai')
  const cached = await getCached<{ ts: number }>(cacheKey)

  // Don't re-scrape if we scraped in the last 6 hours (unless forced)
  if (!force && cached?.ts && Date.now() - cached.ts < 6 * 60 * 60 * 1000) {
    result.errors.push('Using cached data (scraped within 6h)')
    return result
  }

  const supabase = createAdminClient()

  // Run all scrapers (some may fail gracefully)
  const [adzunaJobs, indeedJobs, baytJobs, employerJobs, jsearchJobs] = await Promise.allSettled([
    scrapeAdzuna(),
    scrapeIndeedRSS(),
    scrapesBayt(),
    scrapeEmployerSites(),
    scrapeJSearch(),
  ])

  const allJobs: Omit<Job, 'id' | 'scraped_at'>[] = []

  if (adzunaJobs.status === 'fulfilled') {
    allJobs.push(...adzunaJobs.value)
    if (adzunaJobs.value.length) result.sources.push('adzuna')
  } else {
    result.errors.push(`Adzuna: ${adzunaJobs.reason}`)
  }

  if (indeedJobs.status === 'fulfilled') {
    allJobs.push(...indeedJobs.value)
    if (indeedJobs.value.length) result.sources.push('indeed_rss')
  } else {
    result.errors.push(`Indeed: ${indeedJobs.reason}`)
  }

  if (baytJobs.status === 'fulfilled') {
    allJobs.push(...baytJobs.value)
    if (baytJobs.value.length) result.sources.push('bayt')
  } else {
    result.errors.push(`Bayt: ${baytJobs.reason}`)
  }

  if (employerJobs.status === 'fulfilled') {
    allJobs.push(...employerJobs.value)
    if (employerJobs.value.length) result.sources.push('employer_sites')
  } else {
    result.errors.push(`Employer sites: ${employerJobs.reason}`)
  }

  if (jsearchJobs.status === 'fulfilled') {
    allJobs.push(...jsearchJobs.value)
    if (jsearchJobs.value.length) result.sources.push('jsearch')
  } else {
    result.errors.push(`JSearch: ${jsearchJobs.reason}`)
  }

  // Deduplicate by external_id+source before inserting
  const seen = new Set<string>()
  const uniqueJobs = allJobs.filter((job) => {
    const key = `${job.source}:${job.external_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Batch upsert in chunks of 100 instead of one-by-one
  const scraped_at = new Date().toISOString()
  const BATCH = 100
  for (let i = 0; i < uniqueJobs.length; i += BATCH) {
    const chunk = uniqueJobs.slice(i, i + BATCH).map((job) => ({ ...job, scraped_at }))
    const { error, data } = await supabase
      .from('jobs')
      .upsert(chunk, { onConflict: 'external_id,source', ignoreDuplicates: false })
      .select('id')
    if (error) {
      result.skipped += chunk.length
    } else {
      result.inserted += data?.length ?? chunk.length
    }
  }

  // Cache the scrape timestamp
  await setCached(cacheKey, { ts: Date.now() }, CACHE_TTL.JOBS_LIST)

  return result
}

export async function getJobs(
  page = 1,
  pageSize = 20,
  search = ''
): Promise<{ jobs: Job[]; total: number }> {
  const supabase = createAdminClient()

  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('scraped_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search.trim()) {
    query = query.or(
      `title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw error

  return { jobs: (data as Job[]) ?? [], total: count ?? 0 }
}

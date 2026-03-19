import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const maxDuration = 15

interface FetchedJob {
  title?: string
  company?: string
  location?: string
  description?: string
  salary_range?: string
  job_type?: string
  job_url?: string
}

interface FetchUrlResponse {
  fetched: boolean
  reason?: string
  job?: FetchedJob
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

export async function POST(request: NextRequest): Promise<NextResponse<FetchUrlResponse>> {
  let url: string
  try {
    const body = await request.json()
    url = String(body?.url ?? '').trim()
  } catch {
    return NextResponse.json({ fetched: false, reason: 'Invalid request body' }, { status: 400 })
  }

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ fetched: false, reason: 'Please provide a valid URL starting with http' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json({
        fetched: false,
        reason: `Site returned ${res.status} — fill in the details manually`,
      })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return NextResponse.json({
        fetched: false,
        reason: 'URL does not point to an HTML page — fill in the details manually',
      })
    }

    html = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      fetched: false,
      reason: `Couldn't reach the page (${msg}) — fill in the details manually`,
    })
  }

  const job = parseJobFromHtml(html, url)

  if (!job.title) {
    return NextResponse.json({
      fetched: false,
      reason: "Couldn't extract job details from this page — fill in the details manually",
      job,
    })
  }

  return NextResponse.json({ fetched: true, job })
}

function parseJobFromHtml(html: string, sourceUrl: string): FetchedJob {
  const $ = cheerio.load(html)
  const job: FetchedJob = { job_url: sourceUrl }

  // Strategy 1: JSON-LD with @type: JobPosting
  $('script[type="application/ld+json"]').each((_, el) => {
    if (job.title) return
    try {
      const raw = $(el).html() ?? ''
      const data = JSON.parse(raw)
      const entries: unknown[] = Array.isArray(data) ? data : [data]

      for (const entry of entries) {
        if (!isRecord(entry)) continue
        if (entry['@type'] !== 'JobPosting') continue

        job.title = textFrom(entry['title'])
        job.description = textFrom(entry['description'])
        job.job_type = textFrom(entry['employmentType'])

        const salary = entry['baseSalary']
        if (isRecord(salary)) {
          const value = salary['value']
          if (isRecord(value)) {
            const min = value['minValue']
            const max = value['maxValue']
            const currency = textFrom(salary['currency']) ?? ''
            if (min && max) job.salary_range = `${currency} ${min}–${max}`.trim()
            else if (min || max) job.salary_range = `${currency} ${min ?? max}`.trim()
          }
        }

        const org = entry['hiringOrganization']
        if (isRecord(org)) job.company = textFrom(org['name'])

        const loc = entry['jobLocation']
        if (isRecord(loc)) {
          const addr = loc['address']
          if (isRecord(addr)) {
            const parts = [
              textFrom(addr['addressLocality']),
              textFrom(addr['addressRegion']),
              textFrom(addr['addressCountry']),
            ].filter(Boolean)
            if (parts.length) job.location = parts.join(', ')
          }
        }

        break
      }
    } catch {}
  })

  // Strategy 2: OpenGraph + meta tags
  if (!job.title) {
    const ogTitle = $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content')
    if (ogTitle) job.title = ogTitle.split(' | ')[0].split(' - ')[0].trim()
  }

  if (!job.description) {
    job.description = $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') || undefined
  }

  if (!job.company) {
    job.company = $('meta[property="og:site_name"]').attr('content') || undefined
  }

  // Strategy 3: Heuristic HTML
  if (!job.title) {
    job.title = $('h1').first().text().trim() || undefined
  }

  if (!job.company) {
    const el = $('[class*="company"]:not(script), [itemprop="hiringOrganization"]').first()
    if (el.length) job.company = el.text().trim().split('\n')[0].trim() || undefined
  }

  // Sanitise description
  if (job.description) {
    job.description = cheerio.load(job.description).text().trim()
    if (job.description.length > 3000) job.description = job.description.slice(0, 3000) + '…'
  }

  if (job.job_type) {
    job.job_type = job.job_type.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return job
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function textFrom(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined
  if (typeof v === 'number') return String(v)
  return undefined
}

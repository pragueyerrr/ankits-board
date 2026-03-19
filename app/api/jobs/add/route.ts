import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import type { Job } from '@/types'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = String(body.title ?? '').trim()
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const randomSuffix = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
  const external_id = `manual_${Date.now()}_${randomSuffix}`
  const now = new Date().toISOString()

  const jobRow = {
    external_id,
    source: 'manual',
    title,
    company: String(body.company ?? '').trim() || null,
    location: String(body.location ?? '').trim() || null,
    description: String(body.description ?? '').trim() || null,
    requirements: String(body.requirements ?? '').trim() || null,
    salary_range: String(body.salary_range ?? '').trim() || null,
    job_url: String(body.job_url ?? '').trim() || null,
    job_type: String(body.job_type ?? '').trim() || null,
    posted_at: now,
    scraped_at: now,
    is_active: true,
    raw_data: { manually_added: true },
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('jobs')
    .insert(jobRow)
    .select('*')
    .single()

  if (error) {
    console.error('Add job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ job: data as Job }, { status: 201 })
}

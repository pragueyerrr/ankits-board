'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, PlusCircle } from 'lucide-react'
import type { Job, Application, JobScore } from '@/types'
import JobCard from '@/components/JobCard'
import dynamic from 'next/dynamic'
import AddJobModal from '@/components/AddJobModal'

const ResumeModal = dynamic(() => import('@/components/ResumeModal'), { ssr: false })

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [showAddJob, setShowAddJob] = useState(false)

  const pageSize = 20

  const fetchJobs = useCallback(async (force = false) => {
    const CACHE_TTL = 2 * 60 * 1000
    const cacheKey = `jobs_v1_${page}_${search}`
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const { jobs: j, total: t, applications: a, ts } = JSON.parse(cached)
          if (Date.now() - ts < CACHE_TTL) {
            setJobs(j)
            setTotal(t)
            setApplications(a)
            setLoading(false)
            return
          }
        }
      } catch {}
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
      })
      const [jobsRes, appsRes] = await Promise.all([
        fetch(`/api/jobs?${params}`).then((r) => r.json()),
        fetch('/api/applications').then((r) => r.json()),
      ])
      const jobs = jobsRes.jobs ?? []
      const total = jobsRes.total ?? 0
      const applications = appsRes.applications ?? []
      setJobs(jobs)
      setTotal(total)
      setApplications(applications)
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ jobs, total, applications, ts: Date.now() })) } catch {}
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const invalidateJobsCache = () => {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i)
        if (k?.startsWith('jobs_v1_')) sessionStorage.removeItem(k)
      }
    } catch {}
  }

  const handleScrape = async () => {
    setScraping(true)
    try {
      await fetch('/api/jobs/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      invalidateJobsCache()
      await fetchJobs(true)
    } finally {
      setScraping(false)
    }
  }

  const handleSave = async (jobId: string) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId }),
    })
    if (res.ok) {
      const data = await res.json()
      setApplications((prev) => [...prev, data.application])
      invalidateJobsCache()
      try { sessionStorage.removeItem('applications_v1') } catch {}
    }
  }

  const handleScore = async (jobId: string): Promise<JobScore | null> => {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.score ?? null
  }

  const handleJobAdded = (newJob: Job) => {
    setJobs((prev) => [newJob, ...prev])
    setTotal((prev) => prev + 1)
    invalidateJobsCache()
  }

  const appByJobId = Object.fromEntries(
    applications.map((a) => [a.job_id, a])
  )

  const totalPages = Math.ceil(total / pageSize)
  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dubai Video &amp; Production Jobs</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total.toLocaleString()} jobs found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddJob(true)} className="btn-secondary">
            <PlusCircle className="w-4 h-4" />
            Add Job
          </button>
          <button onClick={handleScrape} disabled={scraping} className="btn-primary">
            <RefreshCw className={scraping ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            {scraping ? 'Scraping…' : 'Refresh Jobs'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search jobs, companies, skills…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="input pl-9"
        />
      </div>

      {/* Jobs grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 mb-4">
            No jobs found. Click "Refresh Jobs" to scrape new listings.
          </p>
          <button onClick={handleScrape} className="btn-primary">
            <RefreshCw className="w-4 h-4" />
            Scrape Jobs Now
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              application={appByJobId[job.id]}
              onSave={handleSave}
              onScore={handleScore}
              onGenerate={(jobId) => setSelectedJobId(jobId)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      )}

      {selectedJob && (
        <ResumeModal job={selectedJob} onClose={() => setSelectedJobId(null)} />
      )}

      {showAddJob && (
        <AddJobModal onClose={() => setShowAddJob(false)} onJobAdded={handleJobAdded} />
      )}
    </div>
  )
}

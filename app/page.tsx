'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import type { Application, ApplicationStatus } from '@/types'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '@/types'
import { clsx } from 'clsx'

const STATUS_ORDER: ApplicationStatus[] = [
  'applied',
  'heard_back',
  'interview_scheduled',
  'second_interview',
  'offer_received',
  'rejected',
]

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: number
  sub?: string
  color: string
}) {
  return (
    <div className="card p-4">
      <div className={clsx('text-3xl font-bold', color)}>{value}</div>
      <div className="text-sm font-medium text-slate-700 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem('welcome_dismissed') } catch { return true }
  })

  useEffect(() => {
    const CACHE_KEY = 'applications_v1'
    const CACHE_TTL = 2 * 60 * 1000
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) {
          setApplications(data)
          setLoading(false)
          return
        }
      }
    } catch {}
    fetch('/api/applications')
      .then((r) => r.json())
      .then((d) => {
        const apps = d.applications ?? []
        setApplications(apps)
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: apps, ts: Date.now() })) } catch {}
      })
      .finally(() => setLoading(false))
  }, [])

  const handleScrape = async () => {
    setScraping(true)
    setScrapeMsg(null)
    try {
      const res = await fetch('/api/jobs/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true }) })
      const data = await res.json()
      setScrapeMsg(
        data.success
          ? `✓ Added ${data.inserted} new jobs from: ${data.sources.join(', ') || 'none'}`
          : `Error: ${data.error}`
      )
    } catch {
      setScrapeMsg('Scrape failed. Check console.')
    } finally {
      setScraping(false)
    }
  }

  // Compute stats
  const total = applications.length
  const active = applications.filter(
    (a) => !['rejected', 'withdrawn', 'ghosted'].includes(a.status)
  ).length
  const interviews = applications.filter((a) =>
    ['interview_scheduled', 'second_interview'].includes(a.status)
  ).length
  const offers = applications.filter((a) => a.status === 'offer_received').length

  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    count: applications.filter((a) => a.status === s).length,
  })).filter((x) => x.count > 0)

  const recent = applications.slice(0, 5)

  const dismissWelcome = () => {
    try { localStorage.setItem('welcome_dismissed', '1') } catch {}
    setShowWelcome(false)
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      {showWelcome && (
        <div className="card p-5 relative" style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'var(--bg-card)' }}>
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-xs px-2 py-1 rounded"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-raised)' }}
          >
            got it ✕
          </button>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--red)' }}>
            👋 Hi Ankit! Welcome to your board!
          </h2>
          <ol className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>📄 <strong>Step 1:</strong> Go to <strong>My CV</strong> and upload your CV so the AI knows who you are</li>
            <li>🔍 <strong>Step 2:</strong> Head to <strong>Jobs</strong> and hit <strong>Refresh Jobs</strong> to pull in the latest video &amp; production listings</li>
            <li>⭐ <strong>Step 3:</strong> Click <strong>Score Match</strong> on any job to see how well it fits you</li>
            <li>💾 <strong>Step 4:</strong> Hit <strong>Save Job</strong> on the ones you like to track them</li>
            <li>📝 <strong>Step 5:</strong> In <strong>Applications</strong>, generate a tailored resume for each one!</li>
          </ol>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>good luck out there!! you got this 🎬</p>
        </div>
      )}

      {/* Hero header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-500" />
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your Dubai video &amp; production job hunt at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="btn-primary"
          >
            <RefreshCw className={clsx('w-4 h-4', scraping && 'animate-spin')} />
            {scraping ? 'Scraping…' : 'Scrape New Jobs'}
          </button>
        </div>
      </div>

      {scrapeMsg && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          {scrapeMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Applications"
          value={total}
          sub="all time"
          color="text-slate-800"
        />
        <StatCard
          label="Active Pipeline"
          value={active}
          sub="in progress"
          color="text-blue-600"
        />
        <StatCard
          label="Interviews"
          value={interviews}
          sub="scheduled"
          color="text-brand-600"
        />
        <StatCard
          label="Offers"
          value={offers}
          sub="received"
          color="text-green-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pipeline */}
        <div className="card p-4">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            Application Pipeline
          </h2>
          {byStatus.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              No applications yet.{' '}
              <Link href="/jobs" className="text-brand-600 hover:underline">
                Browse jobs →
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {byStatus.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-3">
                  <span
                    className={clsx(
                      'badge w-28 justify-center',
                      APPLICATION_STATUS_COLORS[status]
                    )}
                  >
                    {APPLICATION_STATUS_LABELS[status]}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: `${(count / Math.max(total, 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-4">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-4">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" />
            Recent Activity
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((app) => (
                <div key={app.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-slate-300 shrink-0" />
                  <span className="flex-1 truncate text-slate-700">
                    {app.job?.title ?? 'Unknown job'}
                  </span>
                  <span
                    className={clsx(
                      'badge shrink-0',
                      APPLICATION_STATUS_COLORS[app.status]
                    )}
                  >
                    {APPLICATION_STATUS_LABELS[app.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/applications"
            className="flex items-center gap-1 text-xs text-brand-600 hover:underline mt-3"
          >
            View all applications
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            href: '/jobs',
            icon: Briefcase,
            title: 'Browse Jobs',
            desc: 'Explore scraped Dubai video & production jobs',
          },
          {
            href: '/applications',
            icon: CheckCircle2,
            title: 'Track Applications',
            desc: 'Manage your application pipeline',
          },
          {
            href: '/profile',
            icon: Sparkles,
            title: 'Upload CV',
            desc: 'Base CV for AI resume generation',
          },
        ].map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href} className="card p-4 hover:shadow-md transition-all group">
            <Icon className="w-5 h-5 text-brand-500 mb-2" />
            <h3 className="font-medium text-slate-800 group-hover:text-brand-300">
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

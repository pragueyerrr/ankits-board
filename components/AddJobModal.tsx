'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Link, Loader2, PlusCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Job } from '@/types'

interface Props {
  onClose: () => void
  onJobAdded: (job: Job) => void
}

interface FormData {
  title: string
  company: string
  location: string
  description: string
  requirements: string
  salary_range: string
  job_url: string
  job_type: string
}

const EMPTY_FORM: FormData = {
  title: '', company: '', location: '', description: '',
  requirements: '', salary_range: '', job_url: '', job_type: '',
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export default function AddJobModal({ onClose, onJobAdded }: Props) {
  const [urlInput, setUrlInput] = useState('')
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [fetchMessage, setFetchMessage] = useState('')
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { urlInputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleFetchUrl = async () => {
    const url = urlInput.trim()
    if (!url) return
    setFetchStatus('loading')
    setFetchMessage('')
    try {
      const res = await fetch('/api/jobs/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.fetched && data.job) {
        setForm((prev) => ({
          ...prev,
          title: data.job.title ?? prev.title,
          company: data.job.company ?? prev.company,
          location: data.job.location ?? prev.location,
          description: data.job.description ?? prev.description,
          salary_range: data.job.salary_range ?? prev.salary_range,
          job_type: data.job.job_type ?? prev.job_type,
          job_url: url,
        }))
        setFetchStatus('success')
        setFetchMessage('Details fetched — review and edit before saving.')
      } else {
        if (data.job?.title) setForm((prev) => ({ ...prev, title: data.job.title, job_url: url }))
        else setForm((prev) => ({ ...prev, job_url: url }))
        setFetchStatus('error')
        setFetchMessage(data.reason ?? "Couldn't fetch details — fill in manually.")
      }
    } catch {
      setFetchStatus('error')
      setFetchMessage("Couldn't reach our server — fill in the details manually.")
      setForm((prev) => ({ ...prev, job_url: urlInput.trim() }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/jobs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setSubmitError(err.error ?? 'Failed to save job')
        return
      }
      const data = await res.json()
      onJobAdded(data.job)
      onClose()
    } catch {
      setSubmitError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Add Your Own Job
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* URL fetch */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Paste a job URL to autofill (optional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                      style={{ color: 'var(--text-muted)' }} />
                <input
                  ref={urlInputRef}
                  type="url"
                  placeholder="https://boards.greenhouse.io/company/jobs/123"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                  className="input pl-8 text-xs"
                  disabled={fetchStatus === 'loading'}
                />
              </div>
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={!urlInput.trim() || fetchStatus === 'loading'}
                className="btn-secondary text-xs px-3 shrink-0"
              >
                {fetchStatus === 'loading'
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching…</>
                  : 'Fetch'}
              </button>
            </div>
            {fetchStatus === 'success' && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                   style={{ background: 'var(--bg-raised)', color: 'var(--tn-green)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{fetchMessage}</span>
              </div>
            )}
            {fetchStatus === 'error' && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                   style={{ background: 'var(--red-dim)', color: 'var(--tn-yellow)' }}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{fetchMessage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>job details</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Form */}
          <form id="add-job-form" onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Job Title <span style={{ color: 'var(--tn-red)' }}>*</span>
              </label>
              <input type="text" placeholder="e.g. Videographer" value={form.title}
                onChange={setField('title')} className="input" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Company</label>
                <input type="text" placeholder="e.g. OSN" value={form.company}
                  onChange={setField('company')} className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
                <input type="text" placeholder="e.g. Dubai, UAE" value={form.location}
                  onChange={setField('location')} className="input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Salary Range</label>
                <input type="text" placeholder="e.g. AED 15,000–20,000" value={form.salary_range}
                  onChange={setField('salary_range')} className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Job Type</label>
                <select value={form.job_type} onChange={setField('job_type')} className="input">
                  <option value="">— Select —</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Job URL</label>
              <input type="url" placeholder="https://…" value={form.job_url}
                onChange={setField('job_url')} className="input" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Job Description
              </label>
              <textarea placeholder="Paste the job description here — used for AI scoring and resume generation"
                value={form.description} onChange={setField('description')}
                rows={6} className="input resize-y" style={{ minHeight: '120px' }} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Requirements / Qualifications
              </label>
              <textarea placeholder="Key requirements (optional)"
                value={form.requirements} onChange={setField('requirements')}
                rows={3} className="input resize-y" style={{ minHeight: '72px' }} />
            </div>
          </form>

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                 style={{ background: 'var(--red-dim)', color: 'var(--tn-red)' }}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3"
             style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
          <button type="button" onClick={onClose} className="btn-ghost text-xs">Cancel</button>
          <button type="submit" form="add-job-form"
            disabled={submitting || !form.title.trim()} className="btn-primary text-xs">
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : <><PlusCircle className="w-3.5 h-3.5" /> Add Job</>}
          </button>
        </div>
      </div>
    </div>
  )
}

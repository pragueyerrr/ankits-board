'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Download, FileCode, Loader2, RefreshCw, FileText, Sparkles } from 'lucide-react'
import type { Job, ResumeData } from '@/types'
import dynamic from 'next/dynamic'

const PDFDownloadButton = dynamic(() => import('./PDFDownloadButton'), {
  ssr: false,
  loading: () => (
    <button disabled className="btn-secondary text-xs py-1.5 opacity-50">
      <Loader2 className="w-3 h-3 animate-spin" />Loading PDF…
    </button>
  ),
})

const CoverLetterPDFButton = dynamic(() => import('./CoverLetterPDFButton'), {
  ssr: false,
  loading: () => (
    <button disabled className="btn-secondary text-xs py-1.5 opacity-50">
      <Loader2 className="w-3 h-3 animate-spin" />Loading…
    </button>
  ),
})

const WordDownloadButton = dynamic(() => import('./WordDownloadButton'), { ssr: false })
const CoverLetterWordButton = dynamic(() => import('./CoverLetterWordButton'), { ssr: false })

interface Props {
  job: Job
  onClose: () => void
}

export default function ResumeModal({ job, onClose }: Props) {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [latexSource, setLatexSource] = useState<string>('')
  const [coverLetter, setCoverLetter] = useState<string>('')
  const [loadingResume, setLoadingResume] = useState(true)
  const [loadingCL, setLoadingCL] = useState(true)
  const [errorResume, setErrorResume] = useState<string | null>(null)
  const [errorCL, setErrorCL] = useState<string | null>(null)
  const [tab, setTab] = useState<'resume' | 'cover' | 'latex'>('resume')
  const clAbortRef = useRef<AbortController | null>(null)

  const generateResume = async (force = false) => {
    setLoadingResume(true)
    setErrorResume(null)
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, type: 'resume', force }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResumeData(data.resumeData)
      setLatexSource(data.latexSource)
    } catch (e) {
      setErrorResume(String(e))
    } finally {
      setLoadingResume(false)
    }
  }

  const generateCoverLetter = async (force = false) => {
    // Cancel any in-progress cover letter generation
    clAbortRef.current?.abort()
    const abort = new AbortController()
    clAbortRef.current = abort

    setLoadingCL(true)
    setErrorCL(null)
    setCoverLetter('')
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, type: 'cover_letter', force }),
        signal: abort.signal,
      })
      if (!res.ok) throw new Error(await res.text())

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setCoverLetter(text)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      setErrorCL(String(e))
    } finally {
      setLoadingCL(false)
    }
  }

  // Generate both in parallel on mount
  useEffect(() => {
    generateResume()
    generateCoverLetter()
    return () => { clAbortRef.current?.abort() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const downloadLatex = () => {
    const blob = new Blob([latexSource], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-${job.title.replace(/\s+/g, '-').toLowerCase()}.tex`
    a.click()
    URL.revokeObjectURL(url)
  }

  const regenerateAll = () => {
    generateResume(true)
    generateCoverLetter(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              AI Resume &amp; Cover Letter
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {job.title} @ {job.company ?? 'Company'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4 gap-4">
          {([
            { id: 'resume', label: 'Resume', loading: loadingResume },
            { id: 'cover', label: 'Cover Letter', loading: loadingCL },
            { id: 'latex', label: 'LaTeX', loading: false },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                tab === t.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {t.loading && (
                <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Resume tab */}
          {tab === 'resume' && (
            <>
              {loadingResume && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                  <p className="text-sm text-slate-600">Tailoring your resume…</p>
                  <p className="text-xs text-slate-400">15–30 seconds</p>
                </div>
              )}
              {errorResume && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  {errorResume}
                  <button onClick={() => generateResume(true)} className="block mt-2 btn-secondary text-xs">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              )}
              {!loadingResume && !errorResume && resumeData && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="text-xl font-bold">{resumeData.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {[resumeData.email, resumeData.phone, resumeData.location].filter(Boolean).join('  ·  ')}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">{resumeData.summary}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Skills</h4>
                    <div className="space-y-1">
                      {resumeData.skills.map((g, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{g.category}: </span>
                          <span className="text-slate-600">{g.items.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Experience</h4>
                    {resumeData.experiences.map((exp, i) => (
                      <div key={i} className="mb-3">
                        <div className="flex justify-between items-baseline">
                          <span className="font-medium text-sm">{exp.title}</span>
                          <span className="text-xs text-slate-500">{exp.period}</span>
                        </div>
                        <div className="text-xs text-slate-500 italic">{exp.company}</div>
                        <ul className="mt-1 space-y-0.5">
                          {exp.bullets.map((b, j) => (
                            <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                              <span className="text-brand-500 shrink-0">•</span>{b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-400">
                    Layout: {resumeData.fontSizePt}pt · {resumeData.compact ? 'Compact' : 'Standard'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Cover Letter tab */}
          {tab === 'cover' && (
            <>
              {loadingCL && coverLetter === '' && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                  <p className="text-sm text-slate-600">Writing your cover letter…</p>
                  <p className="text-xs text-slate-400">~10 seconds</p>
                </div>
              )}
              {errorCL && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  {errorCL}
                  <button onClick={() => generateCoverLetter(true)} className="block mt-2 btn-secondary text-xs">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              )}
              {coverLetter && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-600" />
                        <span className="text-sm font-medium text-slate-700">
                          Cover Letter — {job.company ?? 'Company'}
                        </span>
                      </div>
                      {loadingCL && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />}
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-[inherit]">
                      {coverLetter}
                      {loadingCL && (
                        <span className="inline-block w-0.5 h-4 bg-brand-500 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">
                    ~{coverLetter.split(/\s+/).length} words
                  </p>
                </div>
              )}
            </>
          )}

          {/* LaTeX tab */}
          {tab === 'latex' && (
            <>
              {loadingResume && (
                <div className="flex items-center gap-2 py-8 justify-center text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating LaTeX…
                </div>
              )}
              {latexSource && (
                <pre className="text-xs font-mono text-slate-700 bg-slate-50 rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed">
                  {latexSource}
                </pre>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t bg-slate-50 rounded-b-2xl flex-wrap">
          {resumeData && !loadingResume && (
            <>
              <PDFDownloadButton data={resumeData} jobTitle={job.title} />
              <WordDownloadButton data={resumeData} jobTitle={job.title} />
            </>
          )}
          {coverLetter && !loadingCL && (
            <>
              <CoverLetterPDFButton coverLetter={coverLetter} job={job} resumeData={resumeData} />
              <CoverLetterWordButton coverLetter={coverLetter} job={job} resumeData={resumeData} />
            </>
          )}
          {latexSource && !loadingResume && (
            <button onClick={downloadLatex} className="btn-secondary text-xs">
              <FileCode className="w-3 h-3" />
              .tex (Overleaf)
            </button>
          )}
          <button
            onClick={regenerateAll}
            disabled={loadingResume || loadingCL}
            className="btn-ghost text-xs ml-auto disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${(loadingResume || loadingCL) ? 'animate-spin' : ''}`} />
            Regenerate All
          </button>
        </div>
      </div>
    </div>
  )
}

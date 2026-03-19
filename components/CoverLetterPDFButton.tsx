'use client'

import { FileText } from 'lucide-react'
import type { Job, ResumeData } from '@/types'

interface Props {
  coverLetter: string
  job: Job
  resumeData?: ResumeData | null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildCoverLetterHTML(
  coverLetter: string,
  job: Job,
  resumeData?: ResumeData | null
): string {
  const signOffPattern = /^(warm regards|best regards|kind regards|sincerely|regards|yours sincerely|best wishes)/i
  const allParagraphs = coverLetter.trim().split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const signOffParagraph = allParagraphs.find((p) => signOffPattern.test(p))
  const extractedName = signOffParagraph ? signOffParagraph.split('\n').slice(1).join(' ').trim() : ''

  const name = resumeData?.name || extractedName || ''
  const email = resumeData?.email ?? ''
  const phone = resumeData?.phone ?? ''
  const location = resumeData?.location ?? 'Dubai, UAE'
  const linkedin = resumeData?.linkedin
    ? resumeData.linkedin.replace(/^https?:\/\//, '')
    : ''
  const portfolio = (resumeData?.portfolio || resumeData?.website)
    ? (resumeData?.portfolio || resumeData?.website)!.replace(/^https?:\/\//, '')
    : ''

  const contactLine = [email, phone, location, linkedin, portfolio]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' &thinsp;·&thinsp; ')

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const paragraphs = allParagraphs.filter((p) => !signOffPattern.test(p))

  const bodyHTML = paragraphs
    .map(
      (p) =>
        `<p>${p.split('\n').map(escapeHtml).join('<br>')}</p>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cover Letter — ${escapeHtml(name)}</title>
<style>
  /* Zero @page margin hides browser print headers/footers */
  @page { size: A4 portrait; margin: 0; }
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: white; }

  .page {
    width: 21cm;
    min-height: 29.7cm;
    background: white;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    color: #1a1a2e;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
  }

  /* Forest green header */
  .letterhead {
    background: #2d6a4f;
    padding: 28pt 40pt 24pt;
    color: white;
    flex-shrink: 0;
  }
  .lh-name {
    font-size: 18pt;
    font-weight: 700;
    letter-spacing: -0.2pt;
    margin-bottom: 5pt;
  }
  .lh-contact {
    font-size: 8.5pt;
    color: rgba(255,255,255,0.82);
    letter-spacing: 0.1pt;
  }

  /* Body */
  .body {
    padding: 28pt 40pt 36pt;
    flex: 1;
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 22pt;
  }
  .company-name {
    font-size: 10pt;
    font-weight: 600;
    color: #374151;
  }
  .company-loc {
    font-size: 9pt;
    color: #6b7280;
    margin-top: 2pt;
  }
  .date {
    font-size: 9pt;
    color: #6b7280;
    text-align: right;
  }

  /* Re: line */
  .re-line {
    background: #f0fdf4;
    border-left: 2.5pt solid #2d6a4f;
    padding: 7pt 12pt;
    margin-bottom: 20pt;
    font-size: 9.5pt;
    font-weight: 600;
    color: #1b4332;
    border-radius: 0 4pt 4pt 0;
  }

  /* Letter text */
  .letter-body p {
    font-size: 10.5pt;
    color: #374151;
    line-height: 1.65;
    margin-bottom: 11pt;
  }
  .letter-body p:last-child { margin-bottom: 0; }

  /* Signature */
  .signature {
    margin-top: 20pt;
  }
  .sig-closing {
    font-size: 10pt;
    color: #4b5563;
    margin-bottom: 14pt;
  }
  .sig-name {
    font-size: 13pt;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 2pt;
  }
  .sig-email {
    font-size: 8.5pt;
    color: #6b7280;
  }

  /* Footer bar */
  .footer-bar {
    height: 5pt;
    background: #2d6a4f;
    flex-shrink: 0;
  }
</style>
</head>
<body>
<div class="page">

  <div class="letterhead">
    <div class="lh-name">${escapeHtml(name)}</div>
    <div class="lh-contact">${contactLine}</div>
  </div>

  <div class="body">
    <div class="meta-row">
      <div>
        <div class="company-name">${escapeHtml(job.company ?? 'Hiring Team')}</div>
        <div class="company-loc">${escapeHtml(job.location ?? 'Dubai, UAE')}</div>
      </div>
      <div class="date">${today}</div>
    </div>

    <div class="re-line">Re: Application for ${escapeHtml(job.title)}</div>

    <div class="letter-body">
      ${bodyHTML}
    </div>

    <div class="signature">
      <div class="sig-closing">Warm regards,</div>
      <div class="sig-name">${escapeHtml(name)}</div>
      ${email ? `<div class="sig-email">${escapeHtml(email)}</div>` : ''}
    </div>
  </div>

  <div class="footer-bar"></div>
</div>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 250))</script>
</body>
</html>`
}

export default function CoverLetterPDFButton({ coverLetter, job, resumeData }: Props) {
  const handleDownload = () => {
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) {
      alert('Please allow popups for this site.')
      return
    }
    win.document.write(buildCoverLetterHTML(coverLetter, job, resumeData))
    win.document.close()
  }

  return (
    <button onClick={handleDownload} className="btn-primary text-xs py-1.5">
      <FileText className="w-3 h-3" />
      Download Cover Letter PDF
    </button>
  )
}

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

function buildCoverLetterWordHTML(
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
    .join(' · ')

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const paragraphs = allParagraphs.filter((p) => !signOffPattern.test(p))

  const bodyHTML = paragraphs
    .map(
      (p) =>
        `<p style="font-size:11pt;color:#374151;line-height:1.65;margin:0 0 10pt">${p.split('\n').map(escapeHtml).join('<br>')}</p>`
    )
    .join('')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="en">
<head>
<meta charset="utf-8">
<title>Cover Letter — ${escapeHtml(name)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a2e; margin: 1in; }
</style>
</head>
<body>
  <div style="background:#2d6a4f;padding:20pt 30pt;margin:-1in -1in 0 -1in;color:white">
    <p style="font-size:18pt;font-weight:700;color:white;margin:0 0 4pt">${escapeHtml(name)}</p>
    <p style="font-size:9pt;color:rgba(255,255,255,0.82);margin:0">${contactLine}</p>
  </div>

  <div style="margin-top:24pt">
    <table style="width:100%;border-collapse:collapse;margin-bottom:18pt"><tr>
      <td style="border:none;padding:0;vertical-align:top">
        <p style="font-weight:600;font-size:10pt;margin:0">${escapeHtml(job.company ?? 'Hiring Team')}</p>
        <p style="font-size:9pt;color:#6b7280;margin:2pt 0 0">${escapeHtml(job.location ?? 'Dubai, UAE')}</p>
      </td>
      <td style="border:none;padding:0;text-align:right;vertical-align:top">
        <p style="font-size:9pt;color:#6b7280;margin:0">${today}</p>
      </td>
    </tr></table>

    <p style="background:#f0fdf4;border-left:3pt solid #2d6a4f;padding:6pt 10pt;font-size:9.5pt;font-weight:600;color:#1b4332;margin:0 0 18pt">${escapeHtml('Re: Application for')} ${escapeHtml(job.title)}</p>

    ${bodyHTML}

    <p style="font-size:10pt;color:#4b5563;margin:18pt 0 12pt">Warm regards,</p>
    <p style="font-size:13pt;font-weight:700;color:#1f2937;margin:0">${escapeHtml(name)}</p>
    ${email ? `<p style="font-size:9pt;color:#6b7280;margin:2pt 0 0">${escapeHtml(email)}</p>` : ''}
  </div>

  <div style="background:#2d6a4f;height:4pt;margin:30pt -1in -1in -1in"></div>
</body>
</html>`
}

export default function CoverLetterWordButton({ coverLetter, job, resumeData }: Props) {
  const handleDownload = () => {
    const html = buildCoverLetterWordHTML(coverLetter, job, resumeData)
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cover-letter-${job.title.replace(/\s+/g, '-').toLowerCase()}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button onClick={handleDownload} className="btn-secondary text-xs py-1.5">
      <FileText className="w-3 h-3" />
      Word (.doc)
    </button>
  )
}

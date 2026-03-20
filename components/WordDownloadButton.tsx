'use client'

import { FileText } from 'lucide-react'
import type { ResumeData } from '@/types'

interface Props {
  data: ResumeData
  jobTitle: string
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildResumeWordHTML(data: ResumeData): string {
  const maxBullets = data.compact ? 2 : 4
  const fs = data.fontSizePt

  const sortedExp = [...data.experiences].sort(
    (a, b) => b.relevanceScore - a.relevanceScore
  )

  const contactParts = [
    data.phone,
    data.email,
    data.location,
    data.linkedin ? data.linkedin.replace(/^https?:\/\//, '') : null,
    (data.portfolio || data.website)
      ? (data.portfolio || data.website)!.replace(/^https?:\/\//, '')
      : null,
  ]
    .filter(Boolean)
    .map((s) => escapeHtml(s as string))
    .join(' · ')

  const sectionTitle = (title: string) =>
    `<p style="font-weight:700;font-size:${fs + 0.5}pt;text-transform:uppercase;color:#6d28d9;border-bottom:1pt solid #6d28d9;padding-bottom:2pt;margin:10pt 0 5pt">${title}</p>`

  const skillsHTML = data.skills
    .map(
      (g) =>
        `<p style="font-size:${fs - 1}pt;color:#374151;margin:2pt 0"><strong>${escapeHtml(g.category)}:</strong> ${g.items.map(escapeHtml).join(', ')}</p>`
    )
    .join('')

  const expHTML = sortedExp
    .map(
      (exp) => `
    <div style="margin-top:8pt">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="border:none;padding:0;font-weight:700;font-size:${fs}pt">${escapeHtml(exp.title)}</td>
        <td style="border:none;padding:0;text-align:right;font-size:${fs - 1}pt;color:#888">${escapeHtml(exp.period)}</td>
      </tr></table>
      <p style="font-style:italic;font-size:${fs - 0.5}pt;color:#555;margin:1pt 0 2pt">${escapeHtml(exp.company)}${exp.location ? ` — ${escapeHtml(exp.location)}` : ''}</p>
      <ul style="margin:0;padding-left:16pt">
        ${exp.bullets.slice(0, maxBullets).map((b) => `<li style="font-size:${fs - 1}pt;color:#374151;margin-bottom:1pt">${escapeHtml(b)}</li>`).join('')}
      </ul>
    </div>`
    )
    .join('')

  const eduHTML = data.education
    .map(
      (e) => `
    <div style="margin-bottom:4pt">
      <table style="width:100%;border-collapse:collapse"><tr>
        <td style="border:none;padding:0;font-weight:700;font-size:${fs - 0.5}pt">${escapeHtml(e.degree)}</td>
        ${e.year ? `<td style="border:none;padding:0;text-align:right;font-size:${fs - 1}pt;color:#888">${escapeHtml(e.year)}</td>` : ''}
      </tr></table>
      <p style="font-size:${fs - 1}pt;color:#555;margin:1pt 0">${escapeHtml(e.institution)}${e.location ? `, ${escapeHtml(e.location)}` : ''}</p>
    </div>`
    )
    .join('')

  const certsHTML = data.certifications?.length
    ? `${sectionTitle('Certifications')}<p style="font-size:${fs - 1}pt;color:#555">${data.certifications.map(escapeHtml).join(' · ')}</p>`
    : ''

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(data.name)} — Resume</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: ${fs}pt; color: #111; margin: 1in; }
  a { color: #111; text-decoration: none; }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:12pt">
    <p style="font-size:${fs + 8}pt;font-weight:700;margin:0 0 3pt">${escapeHtml(data.name)}</p>
    <p style="font-size:${fs - 1}pt;color:#555;margin:0">${contactParts}</p>
  </div>

  ${sectionTitle('Professional Summary')}
  <p style="font-size:${fs - 0.5}pt;color:#374151;line-height:1.5;margin:0">${escapeHtml(data.summary)}</p>

  ${sectionTitle('Skills')}
  ${skillsHTML}

  ${sectionTitle('Experience')}
  ${expHTML}

  ${sectionTitle('Education')}
  ${eduHTML}

  ${certsHTML}
</body>
</html>`
}

export default function WordDownloadButton({ data, jobTitle }: Props) {
  const handleDownload = () => {
    const html = buildResumeWordHTML(data)
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-${jobTitle.replace(/\s+/g, '-').toLowerCase()}.doc`
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

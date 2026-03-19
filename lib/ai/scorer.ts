import { anthropic, MODEL } from './claude'
import type { Job, CVProfile, JobScore } from '@/types'

export async function scoreJob(job: Job, cv: CVProfile): Promise<JobScore> {
  const cvText = cv.raw_text ?? JSON.stringify(cv.parsed_data ?? {})
  const jobText = `
JOB TITLE: ${job.title}
COMPANY: ${job.company ?? 'Unknown'}
LOCATION: ${job.location ?? 'Dubai, UAE'}
DESCRIPTION:
${job.description ?? ''}
REQUIREMENTS:
${job.requirements ?? ''}
`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    system: 'You are a career coach specializing in video production, filmmaking, motion graphics, and creative media roles. Respond only with valid JSON, no markdown.',
    messages: [
      {
        role: 'user',
        content: `Score this CV-to-job match out of 100.

CV: ${cvText.slice(0, 3000)}

JOB: ${jobText.slice(0, 1500)}

Return JSON:
{"total":85,"breakdown":{"titleMatch":18,"skillMatch":34,"experienceLevel":16,"industryMatch":9,"locationBonus":8},"matchedSkills":["skill1"],"missingSkills":["skill2"],"recommendation":"One sentence.","fitLevel":"good"}

fitLevel: "excellent"(85-100), "good"(65-84), "fair"(45-64), "reach"(<45)`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  try {
    // Strip any accidental markdown code fences
    const cleaned = textBlock.text.replace(/```[a-z]*\n?/g, '').trim()
    return JSON.parse(cleaned) as JobScore
  } catch {
    throw new Error(`Failed to parse score JSON: ${textBlock.text.slice(0, 200)}`)
  }
}

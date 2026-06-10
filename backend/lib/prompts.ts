// ─── User context injected into every generation call ────────────────────────
export interface UserContext {
  workField?: string         // e.g. "software engineering", "finance", "management"
  yearsExperience?: number   // 0 = student/beginner, 10+ = senior
  learningSummary?: string   // 100-word bio the user wrote about themselves
  skills?: string[]          // e.g. ["Python", "SQL", "leadership"]
  language: string           // content language code
}

function inferLevel(years?: number): string {
  if (!years || years === 0) return 'beginner'
  if (years <= 2)  return 'junior'
  if (years <= 5)  return 'mid-level'
  if (years <= 10) return 'senior'
  return 'expert'
}

function buildUserContextBlock(ctx: UserContext): string {
  const level = inferLevel(ctx.yearsExperience)
  const parts: string[] = [
    `Experience level: ${level}${ctx.yearsExperience ? ` (${ctx.yearsExperience} years)` : ''}`,
  ]
  if (ctx.workField)        parts.push(`Field: ${ctx.workField}`)
  if (ctx.skills?.length)   parts.push(`Existing skills: ${ctx.skills.join(', ')}`)
  if (ctx.learningSummary)  parts.push(`About learner: ${ctx.learningSummary}`)
  return parts.join('\n')
}

// ─── Course outline (stage 1 — headings only, ~200 tokens) ───────────────────
export function buildOutlinePrompt({
  topic,
  description,
  ctx,
}: {
  topic: string
  description?: string
  ctx: UserContext
}) {
  const level = inferLevel(ctx.yearsExperience)
  return `Generate a learning outline for the topic: "${topic}"${description ? `\nContext: ${description}` : ''}.

LEARNER PROFILE:
${buildUserContextBlock(ctx)}

Rules:
- Generate 4-7 sections appropriate for a ${level}-level learner
- Skip sections covering skills the learner already has
- Each section = one focused concept, 5-minute read
- Do NOT generate content yet — headings and 1-line summaries only
- Respond in ${ctx.language}

Return ONLY valid JSON:
{
  "title": "string (refined topic title in ${ctx.language})",
  "sections": [
    { "title": "string", "summary": "string (1 sentence)", "position": number }
  ]
}`
}

// ─── Section content (stage 2 — one section at a time, ~500 tokens) ──────────
export function buildSectionContentPrompt({
  courseTitle,
  sectionTitle,
  sectionSummary,
  ctx,
}: {
  courseTitle: string
  sectionTitle: string
  sectionSummary?: string
  ctx: UserContext
}) {
  const level = inferLevel(ctx.yearsExperience)
  return `Generate lesson content for one section of the course "${courseTitle}".
Section: "${sectionTitle}"${sectionSummary ? `\nSection goal: ${sectionSummary}` : ''}

LEARNER PROFILE:
${buildUserContextBlock(ctx)}

Rules:
- Target a ${level}-level learner in ${ctx.workField || 'any field'}
- 5-minute read maximum (~400 words for overview + keyPoints combined)
- Use examples relevant to ${ctx.workField || 'everyday life'}
- Practical over theoretical — what can they DO with this knowledge?
- Respond entirely in ${ctx.language}

Return ONLY valid JSON:
{
  "overview": "string (2-3 sentences introducing the concept)",
  "keyPoints": [
    { "point": "string", "detail": "string (1 sentence elaboration)" }
  ],
  "example": { "scenario": "string", "explanation": "string" },
  "takeaway": "string (1-sentence key insight to remember)",
  "hasCode": boolean
}`
}

// ─── Section quiz (lazy — generated when section is opened or completed) ─────
export function buildSectionQuizPrompt({
  courseTitle,
  sectionTitle,
  sectionContent,
  ctx,
  count = 4,
}: {
  courseTitle: string
  sectionTitle: string
  sectionContent?: string
  ctx: UserContext
  count?: number
}) {
  return `Generate ${count} quiz questions for the section "${sectionTitle}" from the course "${courseTitle}".

LEARNER PROFILE:
${buildUserContextBlock(ctx)}

${sectionContent ? `Section content summary:\n${sectionContent}\n` : ''}
Rules:
- All text in ${ctx.language}
- Last question MUST be type "feynman" (open-text, no options, no correct field)
- MCQ: exactly 4 options per question
- Test practical understanding, not memorization

Return ONLY valid JSON:
{
  "questions": [
    {
      "type": "mcq",
      "question": "string",
      "options": ["string","string","string","string"],
      "correct": "string",
      "explanation": "string"
    }
  ]
}`
}

// ─── AI Roadmap generation (structured, graph-ready) ─────────────────────────
export function buildRoadmapGenerationPrompt({
  topic,
  ctx,
}: {
  topic: string
  ctx: UserContext
}) {
  const level = inferLevel(ctx.yearsExperience)
  return `Generate a learning roadmap for: "${topic}"

LEARNER PROFILE:
${buildUserContextBlock(ctx)}

Rules:
- 8-15 nodes for a ${level}-level learner
- Skip fundamentals the learner already knows (check their existing skills)
- Nodes arranged in logical learning order with prerequisites
- Each node = 1 focused concept, ~30-60 min to complete
- Respond titles/descriptions in ${ctx.language}

Return ONLY valid JSON:
{
  "title": "string",
  "description": "string",
  "nodes": [
    {
      "id": "string (slug, e.g. 'intro-to-x')",
      "title": "string",
      "type": "concept|project|quiz|milestone",
      "estimated_minutes": number,
      "week": number,
      "description": "string (1 sentence)"
    }
  ],
  "edges": [
    { "source": "string (node id)", "target": "string (node id)" }
  ]
}`
}

export function buildTutorPrompt({
  nodeId,
  roadmapContext,
  userLanguage,
  userLevel,
  sessionHistory,
  userCtx,
}: {
  nodeId?: string
  roadmapContext?: any
  userLanguage: string
  userLevel: string
  sessionHistory?: string
  userCtx?: Partial<UserContext>
}) {
  const ctxBlock = userCtx ? `\nLEARNER BACKGROUND:\n${buildUserContextBlock({ ...userCtx, language: userLanguage })}` : ''
  return `You are an expert learning tutor. Help the user understand concepts clearly.

RULES:
- Always respond in ${userLanguage}
- Adapt explanation depth to ${userLevel} level
- Keep responses under 200 words unless the user asks for more
- Use culturally relevant examples for ${userLanguage} speakers when possible
- If the user says "I don't understand" twice in a row, switch to a simpler analogy
- Never give exercise answers directly — guide with hints only
${ctxBlock}
CURRENT CONTEXT:
- Roadmap: ${roadmapContext?.roadmapTitle || 'General'}
- Current node: ${roadmapContext?.nodeTitle || 'General'} (${roadmapContext?.nodeType || 'concept'})
- Progress: ${roadmapContext?.completedNodes || 0}/${roadmapContext?.totalNodes || '?'} nodes done

${sessionHistory ? `RECENT SESSION SUMMARY:\n${sessionHistory}` : ''}

Respond conversationally. Minimal markdown — this is a mobile chat interface.`
}

export function buildFeynmanPrompt({ concept, language }: { concept: string; language: string }) {
  return `Evaluate this student's explanation of "${concept}".
Return ONLY valid JSON, no markdown:
{
  "score": number,
  "passed": boolean,
  "feedback": string,
  "gaps": string[]
}
Scoring: Accuracy 40pts + Simplicity 30pts + Completeness 30pts.
passed = score >= 70.
feedback = 1-2 sentences in ${language}.
gaps = missed concepts in ${language}.`
}

export function buildQuizPrompt({
  nodeTitle,
  nodeContent,
  language,
  difficulty,
  count = 5,
}: {
  nodeTitle: string
  nodeContent?: string
  language: string
  difficulty: string
  count?: number
}) {
  return `Generate ${count} quiz questions for the topic: "${nodeTitle}".
Return ONLY valid JSON:
{
  "questions": [
    {
      "type": "mcq",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct": "string",
      "explanation": "string"
    }
  ]
}
Rules:
- Last question MUST be type "feynman" (no options, no correct field)
- All text in ${language}
- Difficulty: ${difficulty}
- MCQ options: exactly 4 per question
- Explanations in ${language}
${nodeContent ? `Node content summary: ${nodeContent}` : ''}`
}

export function buildExplainPrompt({
  nodeTitle,
  nodeType,
  language,
  userLevel,
}: {
  nodeTitle: string
  nodeType: string
  language: string
  userLevel: string
}) {
  return `Generate structured lesson content for the concept: "${nodeTitle}" (type: ${nodeType}).
Return ONLY valid JSON:
{
  "coreConcept": "string (2-3 sentences, ${language})",
  "codeExample": { "language": "string", "code": "string", "explanation": "string" },
  "tryIt": "string (exercise prompt in ${language})",
  "goDeeper": "string (additional context in ${language})"
}
- Target level: ${userLevel}
- All explanations in ${language}
- Code comments in English (V1; will be localized in V2)
- Keep coreConcept concise — mobile reading experience`
}

// V2: Local context example generation
export function buildLocalContextPrompt({
  concept,
  language,
  locale,
}: {
  concept: string
  language: string
  locale: string
}) {
  const localExamples: Record<string, string> = {
    hi: 'Indian tech companies like Flipkart, Zomato, or IRCTC',
    ar: 'regional platforms like Noon, Careem, or government services',
    es: 'Latin American companies like Mercado Libre or Rappi',
    en: 'everyday examples like Amazon, Uber, or Netflix',
  }
  const context = localExamples[locale] || localExamples['en']

  return `Rewrite this concept explanation using examples from ${context}.
Keep the technical accuracy identical. Only change the example context.
Concept: ${concept}
Output the rewritten explanation in ${language} only. No preamble.`
}

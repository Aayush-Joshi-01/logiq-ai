export function buildTutorPrompt({
  nodeId,
  roadmapContext,
  userLanguage,
  userLevel,
  sessionHistory,
}: {
  nodeId?: string
  roadmapContext?: any
  userLanguage: string
  userLevel: string
  sessionHistory?: string
}) {
  return `You are an expert learning tutor. Help the user understand concepts clearly.

RULES:
- Always respond in ${userLanguage}
- Adapt explanation depth to ${userLevel} level
- Keep responses under 200 words unless the user asks for more
- Use culturally relevant examples for ${userLanguage} speakers when possible
- If the user says "I don't understand" twice in a row, switch to a simpler analogy
- Never give exercise answers directly — guide with hints only

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

// SM-2 spaced repetition algorithm
// quality: 0 = complete blackout, 5 = perfect response
export function sm2({
  quality,
  interval,
  easeFactor,
  repetitions,
}: {
  quality:     number
  interval:    number
  easeFactor:  number
  repetitions: number
}) {
  if (quality < 3) {
    // Failed — reset
    return { newInterval: 1, newEaseFactor: easeFactor, newRepetitions: 0 }
  }

  const newEaseFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )

  let newInterval: number
  if (repetitions === 0)      newInterval = 1
  else if (repetitions === 1) newInterval = 6
  else                        newInterval = Math.round(interval * newEaseFactor)

  return {
    newInterval,
    newEaseFactor,
    newRepetitions: repetitions + 1,
  }
}

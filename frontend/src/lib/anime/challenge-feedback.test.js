import { describe, expect, it } from 'vitest'
import { animeWorkoutProofIssue, challengeWorkoutFeedback, restoredChallengeSummary } from './challenge-feedback.js'
import { activeChallengeProgress, exitChallenge } from './challenge-mode.js'

const at = new Date(2026, 9, 1, 10).getTime()
const day = i => `2026-10-${String(i + 1).padStart(2, '0')}`
const routine = i => `r${i}`
const attempt = () => ({
  v: 3, id: 'saitama-7', startedAt: at, routineIds: ['r1', 'r2', 'r3'],
  objective: { v: 1, anchorId: 'push', exerciseName: 'Push-up',
    baselineTotal: 12, minGain: 2, finalTotal: 18,
    checkpointAt: null, checkpointTotal: null },
})
const workout = (i, reps = [6, 6], offset = i) => ({
  id: `w${i}`, d: day(offset), start: at + i * 86400000 - 500, end: at + i * 86400000,
  routineIds: [routine(i)], routineId: routine(i),
  entries: [{ id: 'push', sets: reps.map(r => ({ r, done: true })) }],
  animeAscension: { v: 1, path: 'saitama', challengeId: 'saitama-7',
    routineId: routine(i), slot: 'A', trainingWeek: 1,
    requirements: [{ id: 'push', reps: [6, 6] }] },
})
const state = () => ({
  active: null, week: { 1: ['r1'] }, routines: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
  workouts: [],
  animeAscension: {
    path: 'saitama', challenges: { saitama: [attempt()] },
    challengeMode: { v: 2, id: 'saitama-7', path: 'saitama', startedAt: at,
      routineIds: ['r1', 'r2', 'r3'], before: { 1: ['main'] },
      installed: { 1: ['r1'] }, previousPath: 'saitama' },
  },
})

describe('MVP Pass 2: challenge saved-workout feedback', () => {
  it('ignores unrelated workouts and announces a verified session', () => {
    const s = state()
    expect(challengeWorkoutFeedback(s)).toBeNull()
    s.workouts.push(workout(1))
    expect(challengeWorkoutFeedback(s)).toMatchObject({ kind: 'credited', session: 1 })
    s.workouts.push({ id: 'other', start: at + 200000, end: at + 200001, routineIds: ['random'] })
    expect(challengeWorkoutFeedback(s)).toMatchObject({ kind: 'credited', session: 1 })
  })
  it('explains a correct final routine saved without the Anime snapshot', () => {
    const s = state()
    s.workouts.push(workout(1), workout(2))
    const third = workout(3, [9, 9])
    delete third.animeAscension
    s.workouts.push(third)
    const feedback = challengeWorkoutFeedback(s)
    expect(feedback).toMatchObject({ kind: 'uncredited', session: 3 })
    expect(feedback.detail).toMatch(/No Anime Ascension proof/)
    expect(activeChallengeProgress(s).count).toBe(2)
  })
  it('explains a missed set and an exercise with no repetition count', () => {
    const s = state()
    const first = workout(1)
    first.entries[0].sets[1].done = false
    s.workouts.push(first)
    expect(challengeWorkoutFeedback(s).detail).toMatch(/not marked complete/)
    first.entries[0].sets[1] = { min: 10, speed: 4, done: true }
    expect(animeWorkoutProofIssue(first)).toMatch(/no repetition count/)
  })
  it('explains why a final assessment score is insufficient even when the workout is valid', () => {
    const s = state()
    s.workouts.push(workout(1), workout(2), workout(3, [7, 7]))
    expect(activeChallengeProgress(s).count).toBe(2)
    expect(challengeWorkoutFeedback(s)).toMatchObject({ kind: 'uncredited', session: 3 })
    expect(challengeWorkoutFeedback(s).detail).toMatch(/14 of 18 required/)
  })
  it('rejects a repeated earlier routine without inventing progress', () => {
    const s = state()
    s.workouts.push(workout(1), workout(2))
    const repeated = workout(1)
    repeated.id = 'repeat'
    repeated.end = at + 4 * 86400000
    repeated.d = day(4)
    s.workouts.push(repeated)
    expect(activeChallengeProgress(s).count).toBe(2)
    expect(challengeWorkoutFeedback(s).detail).toMatch(/next required workout is Trial 3/)
  })
  it('preserves separate-day requirements after temporary QA mode is removed', () => {
    const s = state()
    s.workouts.push(workout(1), workout(2, [6, 6], 1))
    expect(activeChallengeProgress(s).count).toBe(1)
    expect(challengeWorkoutFeedback(s).detail).toMatch(/already credited on this calendar date/)
  })
  it('reads bonus and tier unlock from saved history, not from a new reward counter', () => {
    const s = state()
    s.workouts.push(workout(1), workout(2), workout(3, [9, 9]))
    expect(activeChallengeProgress(s).finished).toBe(true)
    exitChallenge(s)
    const result = restoredChallengeSummary(s)
    expect(result).toMatchObject({ valid: true, xp: 60, restored: true, nextTier: 'Hero Endurance Circuit' })
    expect(restoredChallengeSummary(s)).toEqual(result)
    expect(s.workouts).toHaveLength(3)
    expect(s.routines).toHaveLength(0)
    s.workouts[2].entries[0].sets[0].done = false
    expect(restoredChallengeSummary(s)).toMatchObject({ valid: false })
  })
  it('does not show a success receipt after a cancellation', () => {
    const s = state()
    exitChallenge(s, { cancel: true })
    expect(restoredChallengeSummary(s)).toBeNull()
  })
})

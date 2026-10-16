import { describe, expect, it } from 'vitest'
import { heroTrainingInsights } from './hero-training-insights.js'

const NOW = new Date(2026, 9, 16, 12)
const startedAt = new Date(2026, 9, 1, 12).getTime()
const state = workouts => ({
  unit: 'kg', workouts,
  animeAscension: { programs: { saitama: { v: 1, startedAt, loadedWeek: 1 } } },
})
let counter = 0
const workout = (date, slot, weight, opts = {}) => {
  const id = opts.id || `test-${++counter}`
  const routineId = `routine-${slot}`
  const sets = Array.from({ length: 3 }, () => ({ done: true, r: 8, w: weight, ...(opts.rir == null ? {} : { rir: opts.rir }) }))
  return {
    id, d: date, end: new Date(`${date}T18:00:00`).getTime(),
    routineIds: [routineId], entries: [{ id: '0025', sets }],
    animeAscension: { v: 1, path: opts.path || 'saitama', routineId,
      slot, trainingWeek: 1, requirements: [{ id: '0025', reps: [8, 8, 8] }],
      ...(opts.challengeId ? { challengeId: opts.challengeId } : {}) },
  }
}

describe('Hero Path Pass 3 read-only insights', () => {
  it('shows no insights until the selected character arc has started', () => {
    expect(heroTrainingInsights({ workouts: [] }, 'saitama', NOW)).toBeNull()
    expect(heroTrainingInsights(state([]), 'unknown', NOW)).toBeNull()
  })

  it('counts only verified credited sessions, excluding challenges and unrelated history', () => {
    const first = workout('2026-10-12', 'A', 40)
    const second = workout('2026-10-13', 'B', 42.5)
    const challenge = workout('2026-10-14', 'C', 45, { challengeId: 'tier-1' })
    const wrongPath = workout('2026-10-15', 'D', 45, { path: 'goku' })
    const incomplete = { ...workout('2026-10-16', 'E', 45), entries: [{ id: '0025', sets: [{ done: false, r: 8, w: 45 }] }] }
    const workouts = [first, second, challenge, wrongPath, incomplete, { ...first }]
    const before = structuredClone(workouts)
    const summary = heroTrainingInsights(state(workouts), 'saitama', NOW)
    expect(summary.thisWeek).toBe(2)
    expect(summary.target).toBe(5)
    expect(summary.currentWorkSets).toBe(6)
    expect(summary.lastFourWeeks).toBe(2)
    expect(summary.lifts).toHaveLength(1)
    expect(summary.lifts[0].changePct).toBeGreaterThan(0)
    expect(workouts).toEqual(before) // no XP/history mutation
  })

  it('groups cross-week sessions into calendar weeks and keeps current week separate', () => {
    const s = state([
      workout('2026-10-06', 'A', 40), workout('2026-10-08', 'B', 40),
      workout('2026-10-13', 'C', 40),
    ])
    const summary = heroTrainingInsights(s, 'saitama', NOW)
    expect(summary.weeks.map(w => w.sessions)).toEqual([0, 0, 2, 1])
    expect(summary.previousWeek).toBe(2)
    expect(summary.thisWeek).toBe(1)
  })

  it('does not invent RIR or declare someone recovered from an unrated set', () => {
    const unrated = heroTrainingInsights(state([workout('2026-10-12', 'A', 40)]), 'saitama', NOW)
    expect(unrated.averageRir).toBeNull()
    expect(unrated.recoveryNote).toMatch(/Log RIR or RPE/)
    const rated = heroTrainingInsights(state([
      workout('2026-10-12', 'A', 40, { rir: 0 }),
      workout('2026-10-13', 'B', 42.5, { rir: 1 }),
    ]), 'saitama', NOW)
    expect(rated.averageRir).toBe(0.5)
    expect(rated.ratedSets).toBe(6)
    expect(rated.recoveryNote).toMatch(/close to failure/)
  })


  it('does not fabricate a strength trend from duplicate exercises or mixed load units', () => {
    const one = workout('2026-10-12', 'A', 40)
    one.entries.push(structuredClone(one.entries[0]))
    one.animeAscension.requirements.push({ id: '0025', reps: [8, 8, 8] })
    const single = heroTrainingInsights(state([one]), 'saitama', NOW)
    expect(single.lifts).toEqual([])

    const two = workout('2026-10-13', 'B', 90)
    two.unit = 'lb'
    const mixed = heroTrainingInsights(state([one, two]), 'saitama', NOW)
    expect(mixed.lifts).toEqual([])
  })

  it('does not mistake an active or unqualified workout for a finished workout', () => {
    const current = workout('2026-10-12', 'A', 40)
    const future = workout('2026-10-19', 'B', 42.5)
    const summary = heroTrainingInsights(state([current, future]), 'saitama', NOW)
    expect(summary.thisWeek).toBe(1)
    expect(summary.lastFourWeeks).toBe(1)
  })
})

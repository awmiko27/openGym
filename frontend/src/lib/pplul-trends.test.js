import { describe, expect, it } from 'vitest'
import { pplulProgressRows } from './pplul-trends.js'
import { buildPplulPlan } from './pplul.js'
import { EXIDX } from './exercises.js'

const state = () => {
  let i = 0
  const plan = buildPplulPlan({ catalogue: Object.values(EXIDX), uid: () => `routine-${++i}` })
  return { unit: 'kg', routines: plan.routines, week: Object.fromEntries(plan.schedule.map(s => [s.day, [s.routineId]])), workouts: [], scheduleMode: 'week' }
}

describe('PPLUL history details', () => {
  it('is empty for untrained, legacy and suspended PPLUL plans', () => {
    const s = state()
    expect(pplulProgressRows(s)).toEqual([])
    s.routines[0].ex[0].prog = 'linear'
    expect(pplulProgressRows(s)).toEqual([])
    expect(pplulProgressRows({ ...state(), animeAscension: { challengeMode: { id: 'saitama-7' } } })).toEqual([])
  })

  it('uses OpenGym session history and leaves its workouts and routines unchanged', () => {
    const s = state()
    const r = s.routines[0]
    const cfg = r.ex[0]
    s.workouts.push({ id: 'w1', d: '2026-10-12', end: new Date('2026-10-12T18:00:00').getTime(), routineIds: [r.id], entries: [
      { id: cfg.id, rid: r.id, planned: { sets: cfg.sets, reps: cfg.reps, repsMin: cfg.repsMin, weight: 0 },
        target: { ...cfg }, sets: Array.from({ length: cfg.sets }, () => ({ r: cfg.repsMin, w: 40, done: true })) },
    ] })
    const before = structuredClone(s)
    const rows = pplulProgressRows(s)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ day: 1, date: '2026-10-12', lastWeight: 40, borrowed: false })
    expect(rows[0].nextKind).toMatch(/hold|up|deload/)
    expect(s).toEqual(before)
  })
})

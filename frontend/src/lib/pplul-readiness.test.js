import { describe, it, expect } from 'vitest'
import { pplulReadiness } from './pplul-readiness.js'
import { buildPplulPlan } from './pplul.js'
import { EXIDX } from './exercises.js'

const state = () => {
  let next = 0
  const plan = buildPplulPlan({ catalogue: Object.values(EXIDX), uid: () => `routine-${++next}` })
  return { unit: 'kg', routines: plan.routines, week: Object.fromEntries(plan.schedule.map(({ day, routineId }) => [day, [routineId]])), workouts: [], scheduleMode: 'week' }
}

describe('PPLUL read-only progression', () => {
  it('needs an exact fixed-week five-day schedule outside challenges or rotations', () => {
    const S = state()
    expect(pplulReadiness(S)).toMatchObject({ upgrade: false, ready: 0, building: 0, deload: 0, notStarted: 29 })
    expect(pplulReadiness({ ...S, week: { ...S.week, 3: [] } })).toBeNull()
    expect(pplulReadiness({ ...S, animeAscension: { challengeMode: { id: 'saitama-7' } } })).toBeNull()
    expect(pplulReadiness({ ...S, scheduleMode: 'rotation' })).toBeNull()
    expect(pplulReadiness({ ...S, queue: { ids: ['some-other-plan'] } })).toBeNull()
  })
  it('does not overwrite legacy routines to show an upgrade prompt', () => {
    const S = state()
    S.routines[0].ex[0].prog = 'linear'
    const before = structuredClone(S)
    expect(pplulReadiness(S).upgrade).toBe(true)
    expect(S).toEqual(before)
  })
  it('shows logged RIR only after five real ratings and excludes warmups, incomplete and unrelated work', () => {
    const S = state()
    const r = S.routines[0]
    const logged = [
      { r: 8, w: 40, done: true, rir: 2 },
      { r: 8, w: 40, done: true, rpe: 8 },
      { r: 8, w: 40, done: true, rir: 3 },
      { r: 6, w: 20, done: true, rir: 10, phase: 'warmup' },
      { r: 8, w: 40, done: false, rir: 0 },
    ]
    S.workouts.push({ id: 'w1', d: '2026-10-15', end: Date.UTC(2026, 9, 15), routineIds: [r.id], entries: [
      { id: r.ex[0].id, sets: logged },
      { id: r.ex[1].id, sets: [{ r: 8, w: 20, done: true, rir: 2 }, { r: 8, w: 20, done: true, rir: 1 }] },
      { id: 'not-pplul', sets: [{ r: 1, done: true, rir: 0 }] },
    ] })
    expect(pplulReadiness(S)).toMatchObject({ averageRir: 2, ratedSets: 5 })
    S.workouts[0].entries[1].sets = []
    expect(pplulReadiness(S)).toMatchObject({ averageRir: null, ratedSets: 3 })
  })
})

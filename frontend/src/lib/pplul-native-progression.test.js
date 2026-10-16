import { describe, it, expect } from 'vitest'
import { buildPplulPlan } from './pplul.js'
import { EXIDX } from './exercises.js'
import { nextPrescription, applyPrescription, plannedOf } from './progression.js'

const plan = () => {
  let n = 0
  return buildPplulPlan({ catalogue: Object.values(EXIDX), uid: () => `routine-${++n}` })
}

describe('PPLUL native OpenGym progression', () => {
  it('preserves Friday exercises, their full ranges, rest timers and double policy', () => {
    const friday = plan().routines[4]
    expect(friday.ex.map(e => [e.id, e.sets, e.repsMin, e.reps, e.restSec, e.prog])).toEqual([
      ['2224', 3, 8, 12, 150, 'double'],
      ['2290', 2, 8, 12, 120, 'double'],
      ['0585', 2, 10, 15, 90, 'double'],
      ['0599', 3, 10, 15, 90, 'double'],
      ['0605', 3, 12, 20, 75, 'double'],
      ['0175', 2, 10, 15, 75, 'double'],
    ])
  })
  it('starts at the minimum, increases load only after every working set hits the maximum', () => {
    const routine = plan().routines[0]
    const cfg = routine.ex[0]
    const S = { unit: 'kg', workouts: [] }
    const first = nextPrescription(S, cfg, routine)
    expect(first).toMatchObject({ policy: 'double', kind: 'first', reps: cfg.repsMin })
    const applied = applyPrescription(Array.from({ length: cfg.sets }, () => ({ w: 40, r: cfg.reps, done: false })), first)
    expect(applied.map(x => x.r)).toEqual(Array(cfg.sets).fill(cfg.repsMin))

    const workout = reps => ({ id: 'w1', d: '2026-10-15', end: Date.UTC(2026, 9, 15), routineIds: [routine.id], entries: [{
      id: cfg.id, planned: plannedOf(cfg), target: { sets: cfg.sets, reps: cfg.repsMin, weight: 40 },
      sets: Array.from({ length: cfg.sets }, () => ({ w: 40, r: reps, done: true })),
    }] })
    expect(nextPrescription({ ...S, workouts: [workout(cfg.repsMin)] }, cfg, routine).kind).not.toBe('up')
    const top = nextPrescription({ ...S, workouts: [workout(cfg.reps)] }, cfg, routine)
    expect(top).toMatchObject({ kind: 'up', policy: 'double', reps: cfg.repsMin })
    expect(top.weight).toBeGreaterThan(40)
  })
  it('does not change legacy first sessions without a configured range', () => {
    const legacy = nextPrescription({ unit: 'kg', workouts: [] }, { id: '0025', sets: 3, reps: 8, prog: 'double' })
    expect(legacy).toMatchObject({ kind: 'first', policy: 'double' })
    expect(legacy.reps).toBeUndefined()
  })
})

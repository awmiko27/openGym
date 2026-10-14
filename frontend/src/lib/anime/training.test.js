import { describe, expect, it } from 'vitest'
import { CANON_PROGRAMS } from './canon-programs.js'
import { deriveTrainingArc, startTrainingArc, trainingPrescriptionDelta } from './training.js'

const start = Date.UTC(2026, 8, 30)
const day = n => new Date(Date.UTC(2026, 9, 1+n, 12)).toISOString().slice(0, 10)
function record(i, path = 'saitama', options = {}) {
  const slot = options.slot || CANON_PROGRAMS[path].days[i % CANON_PROGRAMS[path].days.length].slot
  const trainingWeek = options.week || Math.floor(i / CANON_PROGRAMS[path].days.length) + 1
  const time = options.day ?? (Math.floor(i / CANON_PROGRAMS[path].days.length) * 7 + [0, 1, 3, 4, 5][i % CANON_PROGRAMS[path].days.length])
  const id = `routine-${i}`
  return { id: `session-${i}`, d: day(time), end: Date.UTC(2026, 9, 1 + time, 16), routineIds: [id],
    animeAscension: { v: 1, path, routineId: id, slot, trainingWeek, requirements: [{ id: 'push', reps: [6, 6] }] },
    entries: [{ id: 'push', sets: [{ r: 6, done: true }, { r: 6, done: true }] }] }
}

describe('canon-inspired character-specific training arcs', () => {
  for (const [path, count] of [['saitama',5],['goku',4],['jinwoo',5]]) {
    it(`${path} requires ${count} distinct sessions and unlocks week two`, () => {
      const state = { ...startTrainingArc(start), loadedWeek: 1 }
      const inputs = Array.from({ length: count }, (_, i) => record(i, path))
      expect(deriveTrainingArc(inputs.slice(0,-1), path, state).done).toBe(count-1)
      const after = deriveTrainingArc(inputs, path, state)
      expect(after.week).toBe(2)
      expect(after.required).toBe(count)
      expect(after.needsLoad).toBe(true)
      expect(after.creditedIds).toHaveLength(count)
    })
  }
  it('requires a recovery date in the five-day split', () => {
    const input = Array.from({ length: 5 }, (_, i) => record(i, 'saitama', { day: i }))
    const result = deriveTrainingArc(input, 'saitama', startTrainingArc(start))
    expect(result.done).toBe(4)
    expect(result.week).toBe(1)
  })
  it('rejects same-day, duplicate slot, incomplete, and stale-week evidence', () => {
    const a = record(0)
    const repeatA = record(1,'saitama',{slot:'A'})
    const early = record(2); early.entries[0].sets[0].done = false
    const duplicateDay = record(3,'saitama',{day:0})
    const stale = record(4,'saitama',{week:99})
    expect(deriveTrainingArc([a,repeatA,early,duplicateDay,stale], 'saitama', startTrainingArc(start)).done).toBe(1)
  })
  it('refuses stale prescriptions after week one, preserving old workout evidence', () => {
    const first = Array.from({length:5},(_,i)=>record(i))
    const old = record(5,'saitama',{week:1})
    const arc = deriveTrainingArc([...first,old], 'saitama', startTrainingArc(start))
    expect(arc.week).toBe(2)
    expect(arc.done).toBe(0)
  })
  it('keeps original phase lengths and capped progression', () => {
    expect(deriveTrainingArc([], 'saitama', startTrainingArc(start)).totalWeeks).toBe(9)
    expect(deriveTrainingArc([], 'goku', startTrainingArc(start)).totalWeeks).toBe(10)
    expect(trainingPrescriptionDelta('saitama',1)).toEqual({sets:0,reps:0})
    expect(trainingPrescriptionDelta('saitama',3).reps).toBeGreaterThan(0)
    expect(trainingPrescriptionDelta('saitama',4).sets).toBe(0)
    expect(trainingPrescriptionDelta('goku',6).sets).toBe(0)
    expect(trainingPrescriptionDelta('jinwoo',99)).toEqual({sets:0,reps:0})
  })
})

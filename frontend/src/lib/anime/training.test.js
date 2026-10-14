import { describe, expect, it } from 'vitest'
import { deriveTrainingArc, startTrainingArc, trainingPrescriptionDelta } from './training.js'

const startedAt = Date.UTC(2026, 8, 30, 0)
function day(offset) { return new Date(Date.UTC(2026, 9, 1 + offset, 12)).toISOString().slice(0, 10) }
function workout(i, path = 'saitama', slot = 'ABC'[i % 3]) {
  const id = `r-${i}`
  return { id: `w-${i}`, d: day(i * 2), end: Date.UTC(2026, 9, 1 + i * 2, 16), routineIds: [id],
    animeAscension: { v: 1, path, routineId: id, slot, trainingWeek: Math.floor(i / 3) + 1, requirements: [{ id: 'push', reps: [6, 6] }] },
    entries: [{ id: 'push', sets: [{ r: 6, done: true }, { r: 6, done: true }] }] }
}

describe('Phase 5 multiweek progression', () => {
  it('starts at week one; advances only after verified A/B/C on recovered dates', () => {
    const program = { ...startTrainingArc(startedAt), loadedWeek: 1 }
    expect(deriveTrainingArc([], 'saitama', program).week).toBe(1)
    expect(deriveTrainingArc([workout(0), workout(1)], 'saitama', program).done).toBe(2)
    const result = deriveTrainingArc([workout(0), workout(1), workout(2)], 'saitama', program)
    expect(result.week).toBe(2)
    expect(result.needsLoad).toBe(true)
    expect(result.creditedIds).toHaveLength(3)
  })
  it('does not count partial, duplicate, pre-start or insufficiently recovered sessions', () => {
    const program = startTrainingArc(startedAt)
    const failed = workout(2); failed.entries[0].sets[1].done = false
    const prior = workout(3); prior.end = startedAt - 1
    const sameDay = workout(4); sameDay.d = workout(1).d
    const result = deriveTrainingArc([workout(0), workout(1), sameDay, failed, prior, workout(0)], 'saitama', program)
    expect(result.done).toBe(2)
    expect(result.week).toBe(1)
  })
  it('requires different A/B/C sessions within a training week', () => {
    const first = workout(0)
    const secondA = workout(1, 'saitama', 'A')
    const third = workout(2, 'saitama', 'C')
    expect(deriveTrainingArc([first, secondA, third], 'saitama', startTrainingArc(startedAt)).week).toBe(1)
  })
  it('blocks progress from sessions using a stale earlier-week prescription', () => {
    const stale = workout(3); stale.animeAscension.trainingWeek = 1
    const result = deriveTrainingArc([workout(0),workout(1),workout(2),stale], 'saitama', startTrainingArc(startedAt))
    expect(result.week).toBe(2)
    expect(result.done).toBe(0)
  })
  it('uses distinct original lengths and phases, and stops after completion', () => {
    const saitama = deriveTrainingArc(Array.from({ length: 27 }, (_, i) => workout(i)), 'saitama', startTrainingArc(startedAt))
    const goku = deriveTrainingArc(Array.from({ length: 30 }, (_, i) => workout(i, 'goku')), 'goku', startTrainingArc(startedAt))
    expect(saitama.completed).toBe(true)
    expect(saitama.totalWeeks).toBe(9)
    expect(goku.completed).toBe(true)
    expect(goku.totalWeeks).toBe(10)
    expect(deriveTrainingArc(Array.from({ length: 18 }, (_, i) => workout(i)), 'saitama', startTrainingArc(startedAt)).phase).toBe('Hero Mastery')
  })
  it('prescription progresses modestly and deloads at phase start', () => {
    expect(trainingPrescriptionDelta('saitama', 1)).toEqual({ sets: 0, reps: 0 })
    expect(trainingPrescriptionDelta('saitama', 3).reps).toBeGreaterThan(0)
    expect(trainingPrescriptionDelta('saitama', 4).sets).toBe(0)
    expect(trainingPrescriptionDelta('saitama', 5).sets).toBe(1)
    expect(trainingPrescriptionDelta('goku', 6).sets).toBe(0)
    expect(trainingPrescriptionDelta('goku', 7).sets).toBe(1)
    expect(trainingPrescriptionDelta('saitama', 99)).toEqual({ sets: 0, reps: 0 })
  })
})

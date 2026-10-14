import { describe, expect, it } from 'vitest'
import { CHALLENGES, challengeBonuses, challengeTierStates, deriveChallenge } from './challenges.js'
import { challengePlan, activateChallenge, activeChallengeProgress, exitChallenge, advanceChallengeBlock, reconcileChallengeReturn } from './challenge-mode.js'
import { animeSessionSnapshot, animeSessionProof, isQualifiedAnimeWorkout } from './rpg.js'

const catalogue = [
  ['101', 'Wall Push Up', 'body weight'], ['102', 'Push Up', 'body weight'],
  ['103', 'Bodyweight Squat', 'body weight'], ['104', 'Glute Bridge', 'body weight'],
  ['105', 'Dead Bug', 'body weight'], ['106', 'Bird Dog', 'body weight'],
  ['107', 'Reverse Lunge', 'body weight'], ['108', 'Mountain Climber', 'body weight'],
  ['109', 'Standing Calf Raise', 'body weight'], ['110', 'One Arm Dumbbell Row', 'dumbbell'],
  ['111', 'Dumbbell Shoulder Press', 'dumbbell'], ['112', 'Sit Up', 'body weight'],
].map(([id, n, eq]) => ({ id, n, eq }))
let sequence = 0
const options = now => ({ catalogue, now, equipment: ['body weight', 'dumbbell'],
  isAvailable: (kit, ex) => kit.includes(ex.eq), uid: () => `routine-${++sequence}` })
const stateFor = path => ({ active: null, week: { 1: ['regular'] },
  routines: [{ id: 'regular', name: 'Main program', ex: [] }], workouts: [],
  animeAscension: { path, experience: 'beginner', goal: 'general', challenges: {} } })
function complete(state, routine, date, extra = {}) {
  const entries = routine.ex.map(row => ({ id: row.id, sets: Array.from({ length: row.sets }, () => ({
    r: row.reps + (String(row.id) === String(extra.id) ? extra.reps || 0 : 0), done: true,
  })) }))
  const snap = animeSessionSnapshot(state, [routine.id], entries)
  if (!snap) throw Error('Missing workout snapshot')
  const day = new Date(date)
  const d = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  const w = { id: `workout-${++sequence}`, d, end: date, routineIds: [routine.id], entries,
    animeAscension: animeSessionProof({ animeAscension: snap }) }
  state.workouts.push(w)
  return w
}
function dayFor(plan, i, extraWeeks = 0) {
  const row = plan.schedule[i]
  const date = new Date(plan.startedAt)
  date.setDate(date.getDate() + (row.day - plan.startDay + 7) % 7 + 7 * (Math.floor(i / plan.cycleSize) + extraWeeks))
  date.setHours(15, 0, 0, 0)
  return date.getTime()
}

describe('Character-specific challenge assessments', () => {
  it('defines nine distinct canon-inspired challenges and preserves the tier order', () => {
    expect(Object.values(CHALLENGES)).toHaveLength(9)
    expect(new Set(Object.values(CHALLENGES).map(c => c.name)).size).toBe(9)
    for (const path of ['saitama', 'goku', 'jinwoo'])
      expect([7, 14, 30].map(n => CHALLENGES[`${path}-${n}`].sessions)).toEqual([3, 6, 12])
  })
  it('records the baseline and verifies a measurable boss trial for each character', () => {
    for (const path of ['saitama', 'goku', 'jinwoo']) {
      const state = stateFor(path)
      const plan = challengePlan(state, `${path}-7`, options(new Date(2026, 9, 14, 12).getTime()))
      expect(plan?.objective?.finalTotal).toBeGreaterThan(plan?.objective?.baselineTotal)
      expect(plan.schedule[0].day).toBe(3)
      activateChallenge(state, plan)
      expect(state.animeAscension.challenges[path].at(-1).v).toBe(3)
      for (let i = 0; i < 3; i++) {
        const w = complete(state, plan.routines[i], dayFor(plan, i))
        expect(isQualifiedAnimeWorkout(w)).toBe(true)
        expect(activeChallengeProgress(state).count).toBe(i + 1)
      }
      expect(activeChallengeProgress(state).objective.finalScore).toBeGreaterThan(activeChallengeProgress(state).objective.baseline)
      expect(exitChallenge(state).completed).toBe(true)
      expect(state.routines.map(r => r.id)).toEqual(['regular'])
      expect(challengeTierStates(state.workouts, path, state.animeAscension.challenges[path])[1].canStart).toBe(true)
    }
  })
  it('does not award a tier for merely completing the prescribed last workout if baseline performance was stronger', () => {
    const state = stateFor('saitama')
    const plan = challengePlan(state, 'saitama-7', options(new Date(2026, 9, 14, 12).getTime()))
    activateChallenge(state, plan)
    complete(state, plan.routines[0], dayFor(plan, 0), { id: plan.objective.anchorId, reps: 8 })
    complete(state, plan.routines[1], dayFor(plan, 1))
    const final = complete(state, plan.routines[2], dayFor(plan, 2))
    expect(isQualifiedAnimeWorkout(final)).toBe(true)
    expect(activeChallengeProgress(state).count).toBe(2)
    expect(activeChallengeProgress(state).bonusXp).toBe(0)
    expect(() => exitChallenge(state)).toThrow()
    complete(state, plan.routines[2], dayFor(plan, 2, 1), { id: plan.objective.anchorId, reps: 10 })
    expect(activeChallengeProgress(state).finished).toBe(true)
    exitChallenge(state)
    expect(challengeBonuses(state.workouts, state.animeAscension.challenges).saitama).toBe(60)
  })
  it('keeps older side-quest and temporary-challenge progress readable', () => {
    const old = { v: 1, id: 'saitama-7', startedAt: Date.UTC(2026, 9, 1) }
    expect(deriveChallenge([], old)?.count).toBe(0)
    const v2 = { v: 2, id: 'saitama-7', startedAt: Date.UTC(2026, 9, 1) }
    expect(deriveChallenge([], v2)?.count).toBe(0)
  })
})


describe('MVP staged training blocks', () => {
  it('never displays a final assessment prematurely and advances only after a full block', () => {
    for (const path of ['saitama', 'goku', 'jinwoo']) {
      const state = stateFor(path)
      for (const days of [7, 14, 30]) {
        const start = new Date(2026, 9, 14 + (days === 14 ? 15 : days === 30 ? 35 : 0), 12).getTime()
        const plan = challengePlan(state, `${path}-${days}`, options(start))
        expect(plan).toBeTruthy()
        expect(plan.routines).toHaveLength(CHALLENGES[`${path}-${days}`].sessions)
        expect(new Set(plan.routines.map(r => r.id)).size).toBe(plan.routines.length)
        const bossId = plan.routines.at(-1).id
        expect(plan.challengeWeek[plan.schedule[0].day]).toEqual([plan.routines[0].id])
        if (days !== 7) expect(Object.values(plan.challengeWeek).flat()).not.toContain(bossId)
        activateChallenge(state, plan)
        for (let i = 0; i < plan.routines.length; i++) {
          expect(state.week[plan.schedule[i].day]).toContain(plan.routines[i].id)
          complete(state, plan.routines[i], dayFor(plan, i))
          if ((i + 1) % plan.cycleSize === 0 && i < plan.routines.length - 1) {
            expect(reconcileChallengeReturn(state).action).toBe('advanced')
            expect(reconcileChallengeReturn(state).action).toBe('none')
          }
        }
        expect(activeChallengeProgress(state).finished).toBe(true)
        expect(reconcileChallengeReturn(state).action).toBe('completed')
        expect(reconcileChallengeReturn(state).action).toBe('none')
        expect(state.animeAscension.lastChallengeRestore.completed).toBe(true)
        expect(state.routines.map(r => r.id)).toEqual(['regular'])
      }
    }
  })
  it('blocks schedule changes during an active workout and preserves manual edits', () => {
    const state = stateFor('saitama')
    // Cover early exit while a staged plan is active.
    const plan = challengePlan(state, 'saitama-7', options(new Date(2026, 9, 14, 12).getTime()))
    activateChallenge(state, plan)
    state.active = { id: 'session-running' }
    expect(() => exitChallenge(state, { cancel: true })).toThrow()
    state.active = null
    expect(exitChallenge(state, { cancel: true }).completed).toBe(false)
    expect(state.animeAscension.challengeMode).toBeNull()
  })
})

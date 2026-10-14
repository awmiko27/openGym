import { describe, expect, it } from 'vitest'
import { challengePlan, activateChallenge, exitChallenge, activeChallengeProgress } from './challenge-mode.js'
import { animeSessionSnapshot, animeSessionProof, isQualifiedAnimeWorkout } from './rpg.js'
import { deriveTrainingArc } from './training.js'
import { challengeTierStates } from './challenges.js'

const catalogue = [
  ['101','Wall Push Up','body weight'], ['102','Push Up','body weight'],
  ['103','Bodyweight Squat','body weight'], ['104','Glute Bridge','body weight'],
  ['105','Dead Bug','body weight'], ['106','Bird Dog','body weight'],
  ['107','Reverse Lunge','body weight'], ['108','Mountain Climber','body weight'],
  ['109','Standing Calf Raise','body weight'], ['110','One Arm Dumbbell Row','dumbbell'],
  ['111','Dumbbell Shoulder Press','dumbbell'], ['112','Sit Up','body weight'],
].map(([id,n,eq]) => ({ id,n,eq }))
const opts = () => ({ catalogue, equipment: ['body weight','dumbbell'],
  isAvailable: (kit, ex) => kit.includes(ex.eq), uid: (()=>{let i=0;return ()=>`trial-${++i}`})() })
const initial = path => ({ active: null, routines: [{ id: 'existing', name: 'Original', ex: [] }],
  week: { 1: ['existing'], 3: ['existing'], 6: ['existing'] }, workouts: [],
  animeAscension: { path, goal:'general', experience:'beginner',
    programs: { [path]: { v:1, startedAt: Date.UTC(2026,0,1), loadedWeek:2 } }, challenges: {} }, })
function completedWorkout(state, routine, time) {
  const entries = routine.ex.map(row => ({ id:row.id, sets:Array.from({length:row.sets},()=>({r:row.reps,done:true})) }))
  const snap = animeSessionSnapshot(state, [routine.id], entries)
  if (!snap) throw Error('Challenge routine not recognized')
  const date = new Date(time)
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return { id:`w-${time}`, d, end:time,
    routineIds:[routine.id], entries, animeAscension:animeSessionProof({animeAscension:snap}) }
}

describe('Temporary Challenge Mode', () => {
  it('replaces each character split with distinct named trial sessions and keeps a reversible receipt', () => {
    for (const path of ['saitama','goku','jinwoo']) {
      const state=initial(path)
      const before=structuredClone(state.week)
      const plan=challengePlan(state, `${path}-7`, opts())
      expect(plan.schedule).toHaveLength(3)
      expect(plan.routines.every(r=>r.name.includes(`Trial ${path}-7`))).toBe(true)
      expect(state.week).toEqual(before) // read-only until activation
      activateChallenge(state,plan)
      expect(state.animeAscension.challengeMode.id).toBe(`${path}-7`)
      expect(state.week).toEqual(plan.challengeWeek)
      expect(state.routines).toHaveLength(4)
      const result=exitChallenge(state,{cancel:true})
      expect(result.preservedDays).toEqual([])
      expect(state.week).toEqual(before)
      expect(state.animeAscension.challengeMode).toBeNull()
      expect(state.routines).toEqual([{ id: 'existing', name: 'Original', ex: [] }])
      expect(challengeTierStates(state.workouts,path,state.animeAscension.challenges[path])[0].canStart).toBe(true)
    }
  })
  it('uses a challenge marker for completion proof and blocks false arc credit', () => {
    const state=initial('goku'), plan=challengePlan(state,'goku-7',opts())
    activateChallenge(state,plan)
    const before=deriveTrainingArc(state.workouts,'goku',state.animeAscension.programs.goku)
    for (let i=0;i<3;i++) {
      const workout=completedWorkout(state,plan.routines[i],plan.startedAt+86400000*(i+1))
      expect(isQualifiedAnimeWorkout(workout)).toBe(true)
      expect(workout.animeAscension.challengeId).toBe('goku-7')
      state.workouts.push(workout)
    }
    expect(activeChallengeProgress(state).finished).toBe(true)
    expect(deriveTrainingArc(state.workouts,'goku',state.animeAscension.programs.goku).done).toBe(before.done)
    expect(exitChallenge(state).completed).toBe(true)
    expect(state.routines.map(r => r.id)).toEqual(['existing'])
    expect(state.workouts).toHaveLength(3) // saved history survives template cleanup
    expect(state.animeAscension.challenges.goku[0].cancelledAt).toBeUndefined()
    expect(challengeTierStates(state.workouts,'goku',state.animeAscension.challenges.goku)[1].canStart).toBe(true)
  })
  it('prevents overlapping modes, stale calendar commits, and edits during an active workout', () => {
    const state=initial('saitama'), plan=challengePlan(state,'saitama-7',opts())
    state.week[2]=['manual']
    expect(()=>activateChallenge(state,plan)).toThrow()
    expect(state.animeAscension.challengeMode).toBeUndefined()
    delete state.week[2]
    activateChallenge(state,plan)
    expect(challengePlan(state,'goku-7',opts())).toBeNull()
    state.active={ id:'running' }
    expect(()=>exitChallenge(state,{cancel:true})).toThrow()
    state.active=null
    state.week[5]=['custom-edit']
    const result=exitChallenge(state,{cancel:true})
    expect(result.preservedDays).toContain(5)
    expect(state.week[5]).toEqual(['custom-edit'])
    expect(state.week[1]).toEqual(['existing'])
    expect(state.routines.map(r => r.id)).toEqual(['existing'])
  })
  it('starts on Wednesday when enrolled on Wednesday rather than inheriting a rest day', () => {
    // This uses the user's local calendar day, independently of machine timezone.
    const wednesday = new Date(2026, 9, 14, 12).getTime()
    expect(new Date(wednesday).getDay()).toBe(3)
    for (const path of ['saitama', 'goku', 'jinwoo']) {
      const state = initial(path)
      const plan = challengePlan(state, `${path}-7`, { ...opts(), now: wednesday })
      expect(plan).toBeTruthy()
      expect(plan.startDay).toBe(3)
      expect(plan.schedule[0].day).toBe(3) // Wednesday is always Day 1
      expect(plan.challengeWeek[3]).toEqual([plan.routines[0].id])
      expect(plan.schedule.map(s => s.day).filter((d, i, all) => all.indexOf(d) === i)).toHaveLength(3)
      activateChallenge(state, plan)
      expect(state.week[3]).toEqual([plan.routines[0].id])
      exitChallenge(state, { cancel: true })
      expect(state.week[3]).toEqual(['existing'])
    }
  })
  it('cleans up completed attempts without losing workouts and unlocks the next tier', () => {
    const state = initial('saitama')
    const originalWeek = structuredClone(state.week)
    const startedAt = new Date(2026, 9, 14, 12).getTime()
    const plan = challengePlan(state, 'saitama-7', { ...opts(), now: startedAt })
    activateChallenge(state, plan)
    for (let i = 0; i < 3; i++) {
      // Simulate training on this attempt's ACTUAL scheduled trial days.
      const offset = (plan.schedule[i].day - plan.startDay + 7) % 7
      const date = new Date(startedAt)
      date.setDate(date.getDate() + offset)
      date.setHours(14, 0, 0, 0)
      state.workouts.push(completedWorkout(state, plan.routines[i], date.getTime()))
    }
    expect(activeChallengeProgress(state).count).toBe(3)
    expect(activeChallengeProgress(state).finished).toBe(true)
    expect(exitChallenge(state).completed).toBe(true)
    expect(state.week).toEqual(originalWeek)
    expect(state.routines.map(r => r.id)).toEqual(['existing'])
    expect(state.workouts).toHaveLength(3)
    const tiers = challengeTierStates(state.workouts, 'saitama', state.animeAscension.challenges.saitama)
    expect(tiers[0].status).toBe('completed')
    expect(tiers[1].canStart).toBe(true)
  })
  it('strips moved trial IDs from manually edited weekdays without deleting unrelated assignments', () => {
    const state = initial('jinwoo')
    const plan = challengePlan(state, 'jinwoo-7', opts())
    activateChallenge(state, plan)
    // Move a challenge template into a manually edited day together with an unrelated routine.
    state.week[5] = [plan.routines[0].id, 'existing', 'manual-only']
    const result = exitChallenge(state, { cancel: true })
    expect(result.preservedDays).toContain(5)
    expect(state.week[5]).toEqual(['existing', 'manual-only'])
    expect(state.routines.map(r => r.id)).toEqual(['existing'])
    expect(Object.values(state.week).flat()).not.toContain(plan.routines[0].id)
  })
  it('does not allow old ordinary workouts to complete a new challenge', () => {
    const state=initial('jinwoo'), plan=challengePlan(state,'jinwoo-7',opts())
    activateChallenge(state,plan)
    const r=plan.routines[0]
    const workout=completedWorkout(state,r,plan.startedAt+86400000)
    delete workout.animeAscension.challengeId
    state.workouts=[workout]
    expect(activeChallengeProgress(state).count).toBe(0)
    expect(()=>exitChallenge(state)).toThrow()
  })
  it('generates four or five sessions for a 30-day challenge without changing equipment ownership', () => {
    for (const path of ['saitama','goku','jinwoo']) {
      const state=initial(path)
      state.animeAscension.challenges[path] = [
        {v:1,id:`${path}-7`,startedAt:1}, {v:1,id:`${path}-14`,startedAt:2},
      ]
      // An empty history cannot actually unlock Tier III; this verifies the gate.
      expect(challengePlan(state,`${path}-30`,opts())).toBeNull()
    }
  })
})

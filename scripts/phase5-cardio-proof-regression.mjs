// Regression for cardio-coded catalogue movements inside rep-only anime plans.
// All data below is fake and in-memory, so no real saved workout is changed.
import assert from 'node:assert/strict'
import { buildSaitamaFoundation } from '../frontend/src/lib/anime/saitama.js'
import { buildCharacterFoundation } from '../frontend/src/lib/anime/character-paths.js'
import { challengePlan, activateChallenge, activeChallengeProgress, challengeNeedsRepRepair,
  repairNextChallengeRoutine, reconcileChallengeReturn } from '../frontend/src/lib/anime/challenge-mode.js'
import { animeSessionSnapshot, animeSessionProof, isQualifiedAnimeWorkout } from '../frontend/src/lib/anime/rpg.js'
import { challengeTierStates } from '../frontend/src/lib/anime/challenges.js'

const catalogue = [
  ['101', 'Wall Push Up', 'body weight'], ['102','Push Up','body weight'],
  ['103','Bodyweight Squat','body weight'], ['104','Glute Bridge','body weight'],
  ['105','Dead Bug','body weight'], ['106','Bird Dog','body weight'],
  ['107','Reverse Lunge','body weight'], ['108','Mountain Climber','body weight'],
  ['109','Standing Calf Raise','body weight'], ['110','One Arm Dumbbell Row','dumbbell'],
  ['111','Dumbbell Shoulder Press','dumbbell'], ['112','Sit Up','body weight'],
].map(([id,n,eq]) => ({ id, n, eq, ...(id === '108' ? { bp:'cardio' } : {}) }))
const cardio = id => catalogue.some(ex => ex.id === String(id) && ex.bp === 'cardio')
let seq = 0
const now = new Date(2026,9,14,11).getTime()
const options = () => ({ catalogue, equipment: ['body weight','dumbbell'],
  isAvailable: (kit, ex) => kit.includes(ex.eq), uid: () => `proof-${++seq}`, now })
const stateFor = path => ({ active: null, routines: [{ id:'regular',name:'Regular',ex:[] }],
  week:{ 1:['regular'], 3:['regular'], 6:['regular'] }, workouts:[],
  animeAscension:{ path, experience:'beginner', goal:'general', challenges:{},
    programs:{ [path]:{v:1,startedAt:1,loadedWeek:2} } } })
const workout = (state, routine, offset) => {
  const end = now + offset
  const day = new Date(end)
  const d = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
  const entries = routine.ex.map(row => ({ id:row.id,
    sets: Array.from({length:row.sets},()=>({r:row.reps,done:true})) }))
  const snapshot = animeSessionSnapshot(state,[routine.id],entries)
  assert.ok(snapshot,`${routine.name} should be rep-verifiable`)
  const result = { id:`proof-workout-${++seq}`,d,end,
    routineIds:[routine.id],entries,animeAscension:animeSessionProof({animeAscension:snapshot}) }
  assert.ok(isQualifiedAnimeWorkout(result))
  return result
}

// Both normal foundation builders must avoid a cardio exercise even when its
// name sounds like a bodyweight movement with repetitions.
for (const path of ['saitama','goku','jinwoo']) {
  const base = path === 'saitama'
    ? buildSaitamaFoundation(options()) : buildCharacterFoundation(path,options())
  assert.ok(base)
  assert.ok(base.routines.every(r => r.ex.length && r.ex.every(row => !cardio(row.id))),
    `${path} regular foundation included time/speed exercise`)
  const state = stateFor(path)
  const plan = challengePlan(state,`${path}-7`,options())
  assert.ok(plan)
  assert.ok(plan.routines.every(r => r.ex.length && r.ex.every(row => !cardio(row.id))),
    `${path} challenge included time/speed exercise`)
}

// Reproduce the user's in-progress Tier I state, where a legacy final trial C
// contains a cardio exercise and the first two verified sessions are already saved.
const s=stateFor('saitama')
const before=structuredClone(s.week)
const p=challengePlan(s,'saitama-7',options())
activateChallenge(s,p)
const offsetOf = i => ((p.schedule[i].day - p.startDay + 7) % 7) * 86400000 + 60000
for (let i=0;i<2;i++) {
  s.workouts.push(workout(s,p.routines[i],offsetOf(i)))
  assert.equal(activeChallengeProgress(s).count,i+1)
  assert.equal(reconcileChallengeReturn(s).action,'none')
}
const final = s.routines.find(r => r.id === p.routines[2].id)
final.ex.unshift({id:'108',sets:2,reps:10,weight:0}) // older broken template
const entriesBeforeRepair = final.ex.map(row=>({id:row.id,sets:Array.from({length:row.sets},()=>
  row.id === '108' ? {min:20,speed:8,done:true} : {r:row.reps,done:true})}))
assert.equal(animeSessionSnapshot(s,[final.id],entriesBeforeRepair),null,
  'The actual failure must be reproducible: cardio prevented snapshot')
const previousIds = s.workouts.map(w=>w.id)
assert.equal(challengeNeedsRepRepair(s,cardio),true)
const repair = repairNextChallengeRoutine(s,cardio)
assert.deepEqual(repair,{changed:true,removed:1,trial:3})
assert.deepEqual(s.workouts.map(w=>w.id),previousIds,'Do not edit history')
assert.equal(challengeNeedsRepRepair(s,cardio),false)
assert.equal(repairNextChallengeRoutine(s,cardio).changed,false,'Repair should be idempotent')
const fixed = s.routines.find(r => r.id === final.id)
assert.ok(fixed.ex.every(row => !cardio(row.id)))
assert.ok(fixed.ex.some(row => row.id === p.objective.anchorId), 'Keep final signature exercise')
s.workouts.push(workout(s,fixed,offsetOf(2)))
assert.equal(activeChallengeProgress(s).count,3)
assert.equal(reconcileChallengeReturn(s).action,'completed')
assert.deepEqual(s.week,before)
assert.deepEqual(s.routines.map(r=>r.id),['regular'])
assert.equal(challengeTierStates(s.workouts,'saitama',s.animeAscension.challenges.saitama)[1].canStart,true)

// An active workout MUST prevent repair, and its snapshot must not change.
const running=stateFor('saitama'), pending=challengePlan(running,'saitama-7',options())
activateChallenge(running,pending)
running.routines.find(r=>r.id===pending.routines[0].id).ex.unshift({id:'108',sets:2,reps:10})
running.active={id:'already-running'}
assert.equal(challengeNeedsRepRepair(running,cardio),false)
assert.equal(repairNextChallengeRoutine(running,cardio).changed,false)
console.log('Cardio proof regression passed: all character foundations, new trials, real cardio failure, in-progress final repair, history preservation, Tier II unlock, calendar restoration, active-workout guard.')

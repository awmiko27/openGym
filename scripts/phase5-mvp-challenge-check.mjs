// Offline, real-engine checks. Does not read or mutate a user's openGym files.
import assert from 'node:assert/strict'
import { CHALLENGES, challengeTierStates, challengeBonuses, deriveChallenge } from '../frontend/src/lib/anime/challenges.js'
import { challengePlan, activateChallenge, exitChallenge, activeChallengeProgress, advanceChallengeBlock, reconcileChallengeReturn } from '../frontend/src/lib/anime/challenge-mode.js'
import { animeSessionSnapshot, animeSessionProof, isQualifiedAnimeWorkout } from '../frontend/src/lib/anime/rpg.js'

const catalogue = [
  ['101','Wall Push Up','body weight'], ['102','Push Up','body weight'],
  ['103','Bodyweight Squat','body weight'], ['104','Glute Bridge','body weight'],
  ['105','Dead Bug','body weight'], ['106','Bird Dog','body weight'],
  ['107','Reverse Lunge','body weight'], ['108','Mountain Climber','body weight'],
  ['109','Standing Calf Raise','body weight'], ['110','One Arm Dumbbell Row','dumbbell'],
  ['111','Dumbbell Shoulder Press','dumbbell'], ['112','Sit Up','body weight'],
].map(([id,n,eq])=>({id,n,eq}))

const makeState = path => ({ active: null, routines: [{id:'original', name:'My Arc',ex:[]}],
  week: {1:['original'],4:['original'],6:['original']}, workouts: [],
  animeAscension: {path, experience:'beginner',goal:'general',challenges:{},programs:{[path]:{v:1,startedAt:1,loadedWeek:2}}} })
let seq=0
const options = now => ({ catalogue, equipment: ['body weight','dumbbell'],
  isAvailable: (kit,ex)=>kit.includes(ex.eq), uid:()=>`trial-${++seq}`, now })
function workout(state,routine,at,{boostExercise=null,boostReps=0}={}) {
  const entries=routine.ex.map(row=>({id:row.id,sets:Array.from({length:row.sets},()=>({
    r:row.reps+(String(row.id)===String(boostExercise)?boostReps:0),done:true,
  }))}))
  const snap=animeSessionSnapshot(state,[routine.id],entries)
  assert.ok(snap,`Must snapshot ${routine.name}`)
  const date=new Date(at)
  const d=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const saved={id:`completed-${++seq}`,d,end:at,routineIds:[routine.id],entries,
    animeAscension:animeSessionProof({animeAscension:snap})}
  assert.equal(isQualifiedAnimeWorkout(saved),true)
  return saved
}
function dayOfSession(plan,index,{extraWeeks=0}={}) {
  const row=plan.schedule[index]
  const weeks=Math.floor(index/plan.cycleSize)+extraWeeks
  const delta=(row.day-plan.startDay+7)%7+weeks*7
  const date=new Date(plan.startedAt)
  date.setDate(date.getDate()+delta)
  date.setHours(17,0,0,0)
  return date.getTime()
}
function perform(state,plan,ix,override={}) {
  const row=plan.schedule[ix]
  assert.ok(state.week[row.day]?.includes(plan.routines[ix].id),`Session ${ix+1} must be visible in Fixed Week`)
  const saved=workout(state,plan.routines[ix],dayOfSession(plan,ix,override),override)
  state.workouts.push(saved)
  return saved
}

assert.equal(Object.keys(CHALLENGES).length,9)
assert.equal(new Set(Object.values(CHALLENGES).map(x=>x.name)).size,9)
const paths=['saitama','goku','jinwoo']
const firstFocus=[]
for (const path of paths) {
  const state=makeState(path)
  const original=structuredClone(state.week)
  for (const [tier,length] of [7,14,30].entries()) {
    const now=new Date(2026,9,14+40*tier,12).getTime()
    const plan=challengePlan(state,`${path}-${length}`,options(now))
    assert.ok(plan,`${path} tier ${length} generates an eligible plan`)
    assert.equal(plan.startDay,new Date(now).getDay())
    assert.equal(plan.schedule[0].day,plan.startDay)
    assert.ok(plan.objective.exerciseName)
    assert.ok(plan.objective.finalTotal>plan.objective.baselineTotal)
    assert.equal(plan.routines.length,CHALLENGES[`${path}-${length}`].sessions)
    assert.equal(plan.cycleSize,length===7?3:length===14?4:path==='goku'?4:5)
    assert.equal(new Set(plan.routines.map(r=>r.id)).size,plan.routines.length)
    assert.equal(Object.keys(plan.challengeWeek).length,plan.cycleSize)
    assert.ok(!Object.values(plan.challengeWeek).flat().includes(plan.schedule.at(-1).routineId) || length===7,
      'Final boss routine must be hidden until its block')
    firstFocus.push(`${path}-${length}:${plan.objective.exerciseName}`)
    activateChallenge(state,plan)
    assert.equal(state.animeAscension.challenges[path].at(-1).v,3)
    for (let i=0;i<CHALLENGES[`${path}-${length}`].sessions;i++) {
      if (i < Math.floor((plan.routines.length - 1) / plan.cycleSize) * plan.cycleSize)
        assert.ok(!Object.values(state.week).flat().includes(plan.routines.at(-1).id),
          `${path}-${length}: boss only appears in the final training block`)
      perform(state,plan,i)
      const progress=activeChallengeProgress(state)
      assert.equal(progress.count,i+1,`${path}-${length}: workout ${i+1} must count`)
      if (i===0) assert.ok(progress.objective.baseline>=plan.objective.baselineTotal)
      if (i+1===plan.objective.checkpointAt) assert.ok(progress.objective.checkpointScore)
      if ((i+1)%plan.cycleSize===0 && i+1<plan.routines.length) {
        const advanced=reconcileChallengeReturn(state)
        assert.equal(advanced.action,'advanced',`${path}-${length} must advance after block`)
        assert.equal(state.week[plan.schedule[i+1].day][0],plan.schedule[i+1].routineId)
        assert.equal(advanceChallengeBlock(state).changed,false,'Idempotent block transition')
      }
    }
    const result=activeChallengeProgress(state)
    assert.equal(result.finished,true)
    assert.ok(result.objective.finalScore>=result.objective.finalTarget)
    assert.equal(reconcileChallengeReturn(state).action,'completed')
    assert.equal(reconcileChallengeReturn(state).action,'none','Auto-restoration must be idempotent')
    assert.equal(state.animeAscension.lastChallengeRestore.completed,true)
    assert.deepEqual(state.week,original)
    assert.deepEqual(state.routines.map(r=>r.id),['original'])
    assert.equal(challengeTierStates(state.workouts,path,state.animeAscension.challenges[path])[tier].status,'completed')
  }
  assert.equal(challengeBonuses(state.workouts,state.animeAscension.challenges)[path],560)
}
// The initial exercise choices change with both the path and challenge tier.
assert.ok(new Set(firstFocus).size===9)

// A properly completed workout is not necessarily a successful boss assessment:
// the final trial must improve on the ACTUAL baseline, not merely clear the
// static prescribed minimum. A retry can satisfy it without duplicate credit.
{
  const state=makeState('saitama')
  const plan=challengePlan(state,'saitama-7',options(new Date(2026,9,14,12).getTime()))
  activateChallenge(state,plan)
  perform(state,plan,0,{boostExercise:plan.objective.anchorId,boostReps:8})
  perform(state,plan,1)
  const final=perform(state,plan,2)
  assert.equal(activeChallengeProgress(state).count,2)
  assert.equal(activeChallengeProgress(state).finished,false)
  assert.equal(reconcileChallengeReturn(state).action,'none',
    'Failed final attempt must not auto-restore the training arc')
  // Finishing a regular workout is still true: only the challenge bonus is withheld.
  assert.equal(isQualifiedAnimeWorkout(final),true)
  assert.throws(()=>exitChallenge(state),/Finish the challenge/)
  perform(state,plan,2,{extraWeeks:1,boostExercise:plan.objective.anchorId,boostReps:10})
  assert.equal(activeChallengeProgress(state).finished,true)
  assert.equal(activeChallengeProgress(state).bonusXp,60)
  assert.equal(exitChallenge(state).completed,true)
  assert.equal(challengeBonuses(state.workouts,state.animeAscension.challenges).saitama,60)
}
console.log('MVP challenge checks passed: 9 per-session programs, staged calendar advances, auto-restoration, tier gates, checkpoints, boss trials, retry and XP.')

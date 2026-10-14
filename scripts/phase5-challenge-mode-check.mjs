import assert from 'node:assert/strict'
import { challengePlan, activateChallenge, exitChallenge } from '../frontend/src/lib/anime/challenge-mode.js'
import { challengeTierStates } from '../frontend/src/lib/anime/challenges.js'
import { animeSessionSnapshot, animeSessionProof } from '../frontend/src/lib/anime/rpg.js'
const catalogue = [
  ['101','Wall Push Up','body weight'], ['102','Push Up','body weight'],
  ['103','Bodyweight Squat','body weight'], ['104','Glute Bridge','body weight'],
  ['105','Dead Bug','body weight'], ['106','Bird Dog','body weight'],
  ['107','Reverse Lunge','body weight'], ['108','Mountain Climber','body weight'],
  ['109','Standing Calf Raise','body weight'], ['110','One Arm Dumbbell Row','dumbbell'],
  ['111','Dumbbell Shoulder Press','dumbbell'], ['112','Sit Up','body weight'],
].map(([id,n,eq])=>({id,n,eq}))
for(const path of ['saitama','goku','jinwoo']) {
  const state={active:null,routines:[],week:{1:['existing'],3:['rest']},workouts:[],animeAscension:{path,experience:'beginner',goal:'general',challenges:{}}}
  let counter=0
  const wednesday = new Date(2026, 9, 14, 12).getTime()
  const plan=challengePlan(state,`${path}-7`,{catalogue,equipment:['body weight','dumbbell'],isAvailable:(eq,ex)=>eq.includes(ex.eq),uid:()=>`id-${++counter}`,now:wednesday})
  assert.ok(plan,`${path} must build a plan`)
  assert.equal(plan.routines.length,3)
  assert.equal(plan.schedule[0].day,3,'Day 1 must be Wednesday when started on Wednesday')
  activateChallenge(state,plan)
  assert.deepEqual(state.week[3],[plan.routines[0].id],'Wednesday has the first challenge workout')
  assert.equal(state.animeAscension.challengeMode.id,`${path}-7`)
  assert.equal(challengeTierStates([],path,state.animeAscension.challenges[path])[0].status,'in-progress')
  exitChallenge(state,{cancel:true})
  assert.deepEqual(state.week,{1:['existing'],3:['rest']})
  assert.deepEqual(state.routines,[],'temporary templates deleted after cancellation')
  assert.equal(challengeTierStates([],path,state.animeAscension.challenges[path])[0].status,'available')
}
// End-to-end simulated completion: three saved workouts on distinct dates,
// then restore old calendar, remove temporary templates, unlock Tier II.
{
  const path='saitama'
  const state={active:null,routines:[{id:'main',name:'Main',ex:[]}],week:{1:['main'],3:['main']},workouts:[],
    animeAscension:{path,goal:'general',experience:'beginner',challenges:{}}}
  let seq=0
  const start=new Date(2026,9,14,12).getTime()
  const plan=challengePlan(state,'saitama-7',{catalogue,equipment:['body weight','dumbbell'],isAvailable:(eq,ex)=>eq.includes(ex.eq),uid:()=>`trial-${++seq}`,now:start})
  activateChallenge(state,plan)
  for(let i=0;i<3;i++) {
    const routine=plan.routines[i]
    const entries=routine.ex.map(e=>({id:e.id,sets:Array.from({length:e.sets},()=>({r:e.reps,done:true}))}))
    const snap=animeSessionSnapshot(state,[routine.id],entries)
    assert.ok(snap,`session ${i} has proof`)
    const offset=(plan.schedule[i].day-plan.startDay+7)%7
    const date=new Date(start)
    date.setDate(date.getDate()+offset)
    date.setHours(14,0,0,0)
    const at=date.getTime()
    const localDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    state.workouts.push({id:`saved-${i}`,d:localDate,end:at,
      routineIds:[routine.id],entries,animeAscension:animeSessionProof({animeAscension:snap})})
  }
  assert.equal(exitChallenge(state).completed,true)
  assert.deepEqual(state.week,{1:['main'],3:['main']})
  assert.deepEqual(state.routines.map(r=>r.id),['main'])
  assert.equal(state.workouts.length,3)
  assert.equal(challengeTierStates(state.workouts,path,state.animeAscension.challenges[path])[1].canStart,true)
}
console.log('Challenge start-date, cancellation cleanup, and 3-workout simulated unlock checks passed.')

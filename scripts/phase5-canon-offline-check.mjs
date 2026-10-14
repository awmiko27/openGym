// Lightweight verification runnable before npm install. No openGym files altered.
import assert from 'node:assert/strict'
import { buildSaitamaFoundation } from '../frontend/src/lib/anime/saitama.js'
import { buildGokuFoundation, buildJinwooFoundation } from '../frontend/src/lib/anime/character-paths.js'
import { CANON_PROGRAMS, cardioGuidance } from '../frontend/src/lib/anime/canon-programs.js'
import { animeSessionSnapshot, isQualifiedAnimeWorkout } from '../frontend/src/lib/anime/rpg.js'
import { deriveTrainingArc, startTrainingArc } from '../frontend/src/lib/anime/training.js'
import { reconcileAnimeSchedule } from '../frontend/src/lib/anime/schedule.js'

const catalogue = [
  ['p', 'Wall Push Up'], ['q','Push Up'], ['s','Bodyweight Squat'],
  ['b','Glute Bridge'],['c','Dead Bug'],['d','Bird Dog'],['u','Sit Up'],
  ['l','Reverse Lunge'],['m','Mountain Climber'],['f','Standing Calf Raise'],
].map(([id,n])=>({id,n,eq:'body weight'}))
const startedAt = Date.UTC(2026,9,1)
const plans = [['saitama',5,buildSaitamaFoundation],['goku',4,buildGokuFoundation],['jinwoo',5,buildJinwooFoundation]]
let checks = 0
for (const [path,count,builder] of plans) {
  let n = 0
  const plan = builder({catalogue,uid:()=>`routine-${path}-${++n}`,equipment:['body weight'],
    isAvailable:(kit,ex)=>kit.includes(ex.eq),profile:{experience:'beginner',trainingWeek:1}})
  assert.ok(plan)
  assert.equal(plan.routines.length,count)
  assert.deepEqual(plan.schedule.map(x=>x.day),CANON_PROGRAMS[path].days.map(x=>x.day))
  assert.ok(plan.routines.every(r=>r.ex.length>=3 && new Set(r.ex.map(e=>e.id)).size===r.ex.length))
  const workouts=plan.routines.map((routine,i)=>{
    const entries=routine.ex.map(e=>({id:e.id,sets:Array.from({length:e.sets},()=>({r:e.reps}))}))
    const snap=animeSessionSnapshot({routines:[routine],animeAscension:{path,programs:{[path]:{loadedWeek:1}}}},[routine.id],entries)
    assert.equal(snap?.slot,CANON_PROGRAMS[path].days[i].slot)
    const day=new Date(Date.UTC(2026,9,2+CANON_PROGRAMS[path].days[i].day-1,12)).toISOString().slice(0,10)
    return {id:`w-${path}-${i}`,d:day,end:Date.UTC(2026,9,2+CANON_PROGRAMS[path].days[i].day-1,15),routineIds:[routine.id],
      animeAscension:snap,entries:entries.map(e=>({...e,sets:e.sets.map(x=>({...x,done:true}))}))}
  })
  assert.ok(workouts.every(isQualifiedAnimeWorkout))
  const active={...startTrainingArc(startedAt),loadedWeek:1}
  assert.equal(deriveTrainingArc(workouts,path,active).week,2)
  const failed=structuredClone(workouts[0]);failed.entries[0].sets[0].done=false
  assert.equal(isQualifiedAnimeWorkout(failed),false)
  assert.equal(deriveTrainingArc([failed,...workouts.slice(1)],path,active).week,1)
  assert.equal(cardioGuidance(path,3).proofRequired,false)
  checks += 10
}
const week={1:['new-goku'],2:['goku-b'],3:['old-saitama'],4:['goku-c'],5:['goku-d']}
const receipt=reconcileAnimeSchedule(week,{1:['old-a'],3:['old-saitama'],5:['old-c']},[1,2,4,5])
assert.deepEqual(week[3],[])
assert.deepEqual(receipt[1],['new-goku'])
checks+=2
console.log(`PASS: ${checks} offline canon-program assertions (${plans.map(([p,n])=>`${p} ${n} days`).join(', ')})`)

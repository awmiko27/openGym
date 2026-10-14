// Built-in Node smoke checks; full Vitest/build still run inside openGym frontend.
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { deriveTrainingArc, startTrainingArc, trainingPrescriptionDelta } from '../frontend/src/lib/anime/training.js'
import { CHALLENGES, beginChallenge, deriveChallenge, challengeBonuses } from '../frontend/src/lib/anime/challenges.js'
import { animeSessionSnapshot, animeSessionProof, isQualifiedAnimeWorkout } from '../frontend/src/lib/anime/rpg.js'
import { buildSaitamaFoundation } from '../frontend/src/lib/anime/saitama.js'
import { buildGokuFoundation, buildJinwooFoundation } from '../frontend/src/lib/anime/character-paths.js'

const at = Date.UTC(2026, 8, 30)
const workout = (i, path='saitama') => {
  const id = 'r' + i
  return { id: `w${i}`, end: Date.UTC(2026, 9, 1 + 2*i, 16),
    d: new Date(Date.UTC(2026, 9, 1 + 2*i, 12)).toISOString().slice(0,10), routineIds: [id],
    animeAscension: {v:1,path,routineId:id,slot:'ABC'[i%3],trainingWeek: Math.floor(i/3)+1,requirements:[{id:'e',reps:[6]}]},
    entries:[{id:'e',sets:[{done:true,r:6}]}] }
}
test('A/B/C sessions with rest advance weeks',()=>{
 const arc=deriveTrainingArc([workout(0),workout(1),workout(2)],'saitama',{...startTrainingArc(at),loadedWeek:1})
 assert.equal(arc.week,2)
 assert.equal(arc.needsLoad,true)
})
test('Stale prescription, same day and unfinished cannot advance',()=>{
 const a=workout(0),b=workout(1),c=workout(2)
 c.animeAscension.trainingWeek=2
 assert.equal(deriveTrainingArc([a,b,c],'saitama',startTrainingArc(at)).week,1)
 c.animeAscension.trainingWeek=1;c.entries[0].sets[0].done=false
 assert.equal(deriveTrainingArc([a,b,c],'saitama',startTrainingArc(at)).done,2)
})
test('Full 9 weeks and 10 weeks complete, separate characters',()=>{
 assert.equal(deriveTrainingArc(Array.from({length:27},(_,i)=>workout(i)),'saitama',startTrainingArc(at)).completed,true)
 assert.equal(deriveTrainingArc(Array.from({length:30},(_,i)=>workout(i,'goku')),'goku',startTrainingArc(at)).completed,true)
 assert.equal(deriveTrainingArc(Array.from({length:30},(_,i)=>workout(i,'goku')),'jinwoo',startTrainingArc(at)).done,0)
})
test('Native RPG snapshot recognizes character week and slot',()=>{
 const S={animeAscension:{path:'goku',programs:{goku:{loadedWeek:2}}},routines:[{id:'r1',name:'Goku · Saiyan Foundation A — Strength · Week 2'}]}
 const snap=animeSessionSnapshot(S,['r1'],[{id:'e',sets:[{r:8}]}])
 assert.equal(snap.slot,'A');assert.equal(snap.trainingWeek,2)
 const proof=animeSessionProof({animeAscension:snap})
 assert.equal(proof.trainingWeek,2)
 const w={id:'w',end:Date.now(),d:'2026-10-14',routineIds:['r1'],animeAscension:proof,entries:[{id:'e',sets:[{done:true,r:8}]}]}
 assert.equal(isQualifiedAnimeWorkout(w),true)
})
test('Nine challenges; opt in and no duplicate bonuses',()=>{
 assert.equal(Object.keys(CHALLENGES).length,9)
 const sessions=[workout(0,'jinwoo'),workout(1,'jinwoo'),workout(2,'jinwoo')]
 const active=beginChallenge('jinwoo-7',at)
 assert.equal(deriveChallenge(sessions,active).finished,true)
 assert.equal(challengeBonuses([...sessions,sessions[2]],{jinwoo:[active,active]}).jinwoo,60)
 assert.equal(challengeBonuses(sessions,{saitama:[beginChallenge('saitama-7',at)]}).saitama,0)
})
test('Overload delta respects phase transition and upper week bound',()=>{
 assert.deepEqual(trainingPrescriptionDelta('saitama',1),{sets:0,reps:0})
 assert.equal(trainingPrescriptionDelta('saitama',5).sets,1)
 assert.deepEqual(trainingPrescriptionDelta('saitama',10),{sets:0,reps:0})
})

test('Native character builders produce genuinely different Week 2 plans',()=>{
 const catalogue=[['p','Wall Push Up'],['q','Push Up'],['s','Bodyweight Squat'],['b','Glute Bridge'],['c','Dead Bug'],['d','Bird Dog'],['l','Reverse Lunge']].map(([id,n])=>({id,n,eq:'body weight'}))
 for (const builder of [buildSaitamaFoundation,buildGokuFoundation,buildJinwooFoundation]) {
   let ix=0
   const args=week=>({catalogue,uid:()=>String(++ix),profile:{experience:'beginner',trainingWeek:week}})
   const w1=builder(args(1)),w2=builder(args(2)),w5=builder(args(5))
   assert.ok(w1&&w2&&w5)
   assert.ok(w2.routines.every(r=>r.name.includes('Week 2')))
   assert.ok(w5.routines[0].ex[0].reps>w1.routines[0].ex[0].reps)
 }
})

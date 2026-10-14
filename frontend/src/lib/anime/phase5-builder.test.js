import { describe, it, expect } from 'vitest'
import { buildSaitamaFoundation } from './saitama.js'
import { buildGokuFoundation, buildJinwooFoundation } from './character-paths.js'
import { animeSessionSnapshot } from './rpg.js'

const exercises = [
  ['p','Wall Push Up'], ['q','Push Up'], ['s','Bodyweight Squat'],
  ['b','Glute Bridge'], ['c','Dead Bug'], ['d','Bird Dog'],
  ['l','Reverse Lunge'], ['m','Mountain Climber'], ['f','Standing Calf Raise'],
].map(([id,n])=>({id,n,eq:'body weight'}))
const args = (week) => ({ catalogue:exercises, uid:(()=>{let i=0;return ()=>`test-${++i}`})(),
  equipment:null, profile:{experience:'beginner',goal:'general',trainingWeek:week} })

describe('week-specific native plans and RPG identity',()=>{
  for (const [path, builder] of [
    ['saitama', buildSaitamaFoundation], ['goku', buildGokuFoundation], ['jinwoo', buildJinwooFoundation],
  ]) {
    it(`${path} creates new names and revised reps for unlocked weeks`,()=>{
      const first=builder(args(1)), second=builder(args(2)), advanced=builder(args(path==='goku'?7:5))
      expect(first.routines.every(r=>!r.name.includes('· Week'))).toBe(true)
      expect(second.routines.every(r=>r.name.includes('· Week 2'))).toBe(true)
      expect(advanced.routines[0].ex[0].reps).toBeGreaterThan(first.routines[0].ex[0].reps)
      const routine=second.routines[0]
      const state={animeAscension:{path,programs:{[path]:{loadedWeek:2}}},routines:[routine]}
      const entries=routine.ex.map(e=>({id:e.id,sets:Array.from({length:e.sets},()=>({r:e.reps}))}))
      const snap=animeSessionSnapshot(state,[routine.id],entries)
      expect(snap).not.toBeNull()
      expect(snap.trainingWeek).toBe(2)
      expect(snap.slot).toBe('A')
    })
  }
})

import { describe, it, expect } from 'vitest'
import { buildSaitamaFoundation } from './saitama.js'
import { buildGokuFoundation, buildJinwooFoundation } from './character-paths.js'
import { animeSessionSnapshot, isQualifiedAnimeWorkout } from './rpg.js'
import { CANON_PROGRAMS } from './canon-programs.js'

const exercises = [
  ['p','Wall Push Up'], ['q','Push Up'], ['s','Bodyweight Squat'],
  ['b','Glute Bridge'], ['c','Dead Bug'], ['d','Bird Dog'],
  ['l','Reverse Lunge'], ['m','Mountain Climber'], ['f','Standing Calf Raise'], ['u','Sit Up'],
].map(([id,n])=>({id,n,eq:'body weight'}))
const args = week => ({ catalogue:exercises, uid:(()=>{let i=0;return ()=>`test-${++i}`})(),
  equipment:null, profile:{experience:'beginner',goal:'general',trainingWeek:week} })

describe('canon-inspired native plans and RPG identities',()=>{
  for (const [path, builder] of [
    ['saitama', buildSaitamaFoundation], ['goku', buildGokuFoundation], ['jinwoo', buildJinwooFoundation],
  ]) {
    it(`${path} creates distinct, verified sessions on the character's weekly schedule`,()=>{
      const first=builder(args(1)), second=builder(args(2)), advanced=builder(args(path==='goku'?7:5))
      expect(first.schedule.map(s=>s.day)).toEqual(CANON_PROGRAMS[path].days.map(d=>d.day))
      expect(first.routines).toHaveLength(CANON_PROGRAMS[path].days.length)
      expect(first.routines.every(r=>!r.name.includes('· Week'))).toBe(true)
      expect(second.routines.every(r=>r.name.includes('· Week 2'))).toBe(true)
      expect(advanced.routines[0].ex[0].reps).toBeGreaterThan(first.routines[0].ex[0].reps)
      for (let i=0; i<second.routines.length; i++) {
        const routine=second.routines[i]
        const state={animeAscension:{path,programs:{[path]:{loadedWeek:2}}},routines:[routine]}
        const entries=routine.ex.map(e=>({id:e.id,sets:Array.from({length:e.sets},()=>({r:e.reps}))}))
        const snap=animeSessionSnapshot(state,[routine.id],entries)
        expect(snap).not.toBeNull()
        expect(snap.slot).toBe(CANON_PROGRAMS[path].days[i].slot)
        expect(snap.trainingWeek).toBe(2)
        const workout={id:`w-${i}`,d:'2026-10-14',end:Date.now(),routineIds:[routine.id],animeAscension:snap,
          entries:entries.map(e=>({...e,sets:e.sets.map(set=>({...set,done:true}))}))}
        expect(isQualifiedAnimeWorkout(workout)).toBe(true)
        workout.entries[0].sets[0].done=false
        expect(isQualifiedAnimeWorkout(workout)).toBe(false)
      }
    })
  }
})

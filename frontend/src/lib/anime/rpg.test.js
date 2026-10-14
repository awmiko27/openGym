import { describe, it, expect } from 'vitest'
import { animeSessionSnapshot, animeActiveFields, animeSessionProof, isQualifiedAnimeWorkout, deriveAnimeRpg, previewAnimeWorkoutRewards, completedAnimeWorkoutRewards } from './rpg.js'

const routine = { id: 'saitamaA', name: 'Saitama · Hero Foundation A' }
const app = { animeAscension: { path: 'saitama' }, routines: [routine] }
const planned = [{ id: 'push', sets: [{ r: 6 }, { r: 6 }] }, { id: 'squat', sets: [{ r: 8 }, { r: 8 }] }]
const snap = animeSessionSnapshot(app, ['saitamaA'], planned)
const wk = (id, d, entries = planned.map(e => ({ id: e.id, sets: e.sets.map(s => ({ r: s.r, done: true })) }))) =>
  ({ id, d, start: 1, end: 2, routineId: 'saitamaA', routineIds: ['saitamaA'], entries, animeAscension: snap })

describe('Anime Ascension Phase 3 RPG', () => {
  it('snapshots only the eligible single-character routine', () => {
    expect(snap).toEqual({ v: 1, path: 'saitama', routineId: 'saitamaA', requirements: [{ id: 'push', reps: [6, 6] }, { id: 'squat', reps: [8, 8] }] })
    expect(animeSessionSnapshot(app, [], planned)).toBe(null)
    expect(animeSessionSnapshot(app, ['saitamaA', 'other'], planned)).toBe(null)
    expect(animeSessionSnapshot({ ...app, animeAscension: { path: 'goku' } }, ['saitamaA'], planned)).toBe(null)
    expect(animeSessionProof({ animeAscension: snap })).toEqual(snap)
    expect(animeActiveFields({ routines: [] }, ['missing'], planned)).toEqual({})
    expect(animeActiveFields(app, ['saitamaA'], planned)).toHaveProperty('animeAscension')
  })
  it('accepts both legacy Saitama titles and new A/B/C training-focus titles', () => {
    for (const title of ['Saitama · Hero Foundation A — Strength', 'Saitama · Hero Foundation B — Endurance', 'Saitama · Hero Foundation C — Conditioning']) {
      const current = { ...app, routines: [{ id: 'saitamaA', name: title }] }
      expect(animeSessionSnapshot(current, ['saitamaA'], planned)).not.toBeNull()
    }
    expect(animeSessionSnapshot({ ...app, routines: [{ id: 'saitamaA', name: 'Saitama · Hero Foundation A — Anything' }] }, ['saitamaA'], planned)).toBeNull()
  })
  it('refuses evidence-less workouts and partial, swapped or excluded workouts', () => {
    expect(isQualifiedAnimeWorkout({ ...wk('a','2026-10-12'), animeAscension: undefined })).toBe(false)
    expect(isQualifiedAnimeWorkout(wk('a','2026-10-12'))).toBe(true)
    expect(isQualifiedAnimeWorkout(wk('a','2026-10-12',[{ id:'push', sets:[{r:6,done:true},{r:6,done:true}] }]))).toBe(false)
    const lowReps = wk('a','2026-10-12'); lowReps.entries[0].sets[1].r = 1
    expect(isQualifiedAnimeWorkout(lowReps)).toBe(false)
    const notDone = wk('a','2026-10-12'); notDone.entries[0].sets[0].done = false
    expect(isQualifiedAnimeWorkout(notDone)).toBe(false)
    const swapped = wk('a','2026-10-12'); swapped.entries[0].id = 'press'
    expect(isQualifiedAnimeWorkout(swapped)).toBe(false)
    expect(isQualifiedAnimeWorkout({ ...wk('a','2026-10-12'), excludeFromProgression: true })).toBe(false)
  })
  it('awards workout, daily and weekly XP only once per unique completed workout', () => {
    const w = [wk('a','2026-10-12'), wk('b','2026-10-14'), wk('c','2026-10-16')]
    const result = deriveAnimeRpg([...w, w[0], { ...w[0], id:'early', animeAscension: null }])
    expect(result.count).toBe(3)
    expect(result.xp).toBe(575)
    expect(result.awards.filter(x => x.key.startsWith('workout:'))).toHaveLength(3)
    expect(result.awards.filter(x => x.key.startsWith('weekly:'))).toHaveLength(1)
    expect(result.rank).toBe('Hero Candidate')
  })
  it('credits only one daily quest on a day, no weekly bonus before third workout', () => {
    const result = deriveAnimeRpg([wk('a','2026-10-12'), wk('b','2026-10-12')])
    expect(result.count).toBe(2)
    expect(result.awards.filter(x => x.key.startsWith('daily:'))).toHaveLength(1)
    expect(result.awards.filter(x => x.key.startsWith('weekly:'))).toHaveLength(0)
  })
  it('preserves milestones and ranks across separate arcs', () => {
    const s = deriveAnimeRpg(Array.from({length:12},(_,i) => wk('w'+i, `2026-10-${String(1+i).padStart(2,'0')}`)))
    expect(s.rank).toBe('B-Class Candidate')
    expect(s.arcs[0].completed).toBe(6)
    expect(s.arcs[1].completed).toBe(6)
    expect(s.achievements.find(x=>x.id==='ten-workouts').earned).toBe(true)
    expect(s.awards.some(x=>x.key==='milestone:hero-discipline')).toBe(true)
  })
  it('derives rewards again after an edit or deletion, instead of retaining phantom XP', () => {
    const history = [wk('a','2026-10-12')]
    const before = deriveAnimeRpg(history)
    history[0].entries[0].sets[0].r = 1
    expect(deriveAnimeRpg(history).count).toBe(0)
    expect(deriveAnimeRpg(history).xp).toBe(0)
    expect(before.xp).toBeGreaterThan(0)
  })
})

// Phase 3.1: the active workout preview and completed-workout summary use
// exactly the same ledger. No extra XP is committed by rendering a preview.
describe('Anime Ascension Phase 3.1 reward preview', () => {
  it('previews first workout and displays remaining prescribed sets', () => {
    const active = { id: 'active-a', d: '2026-10-12', routineIds: ['saitamaA'],
      animeAscension: snap,
      entries: [{ id:'push', sets:[{r:6,done:true},{r:6,done:false}] },
        { id:'squat', sets:[{r:8,done:false},{r:8,done:false}] }],
    }
    const p = previewAnimeWorkoutRewards(active, [])
    expect(p.total).toBe(180)
    expect(p.completed).toBe(1)
    expect(p.required).toBe(4)
    expect(p.ready).toBe(false)
    expect(p.awards.map(a => a.xp).sort((a,b)=>a-b)).toEqual([30,50,100])
    expect(deriveAnimeRpg([]).xp).toBe(0)
    active.entries.forEach(e => e.sets.forEach(s => {s.done=true}))
    expect(previewAnimeWorkoutRewards(active, []).ready).toBe(true)
    active.entries[0].id = 'different'
    expect(previewAnimeWorkoutRewards(active, []).eligible).toBe(false)
  })
  it('previews daily and weekly rewards only when they become available', () => {
    const active = { id:'a3', d:'2026-10-16', routineIds:['saitamaA'], animeAscension:snap,
      entries: planned.map(e => ({id:e.id, sets:e.sets.map(s=>({...s,done:false}))})) }
    const previous = [wk('a','2026-10-12'), wk('b','2026-10-14')]
    const reward = previewAnimeWorkoutRewards(active, previous)
    expect(reward.total).toBe(265) // 100 workout, 30 daily, 75 weekly, 60 milestone
    expect(reward.awards.some(a => a.key.startsWith('weekly:'))).toBe(true)
    const secondSameDay = { ...active, d: '2026-10-14' }
    expect(previewAnimeWorkoutRewards(secondSameDay, previous).awards.some(a => a.key === 'daily:2026-10-14')).toBe(false)
  })
  it('reports only rewards contributed by the saved workout', () => {
    const a = wk('a', '2026-10-12')
    const w = wk('b', '2026-10-14')
    const history = [a,w]
    expect(completedAnimeWorkoutRewards(w, history).total).toBe(130)
    const bad = wk('b', '2026-10-14'); bad.entries[0].sets[0].r=1
    expect(completedAnimeWorkoutRewards(bad, [a, bad]).total).toBe(0)
    expect(completedAnimeWorkoutRewards(bad, [a,bad]).eligible).toBe(false)
    expect(completedAnimeWorkoutRewards({ id:'other' }, [])).toBe(null)
  })
})


describe('Anime Ascension Phase 4 character-specific RPG', () => {
  for (const [path, name] of [
    ['goku', 'Goku · Saiyan Foundation A — Strength'],
    ['jinwoo', 'Sung Jinwoo · Hunter Foundation A — Strength'],
  ]) {
    it(`recognizes ${path} sessions, previews XP and preserves character identity`, () => {
      const current = { animeAscension: { path }, routines: [{ id: path + 'A', name }] }
      const snapshot = animeSessionSnapshot(current, [path + 'A'], planned)
      expect(snapshot).toMatchObject({ v: 1, path, routineId: path + 'A' })
      expect(animeSessionProof({ animeAscension: snapshot }).path).toBe(path)
      const workout = { ...wk(path, '2026-10-13'), routineIds: [path + 'A'], routineId: path + 'A', animeAscension: snapshot }
      expect(isQualifiedAnimeWorkout(workout)).toBe(true)
      expect(deriveAnimeRpg([workout], path).xp).toBe(180)
      expect(deriveAnimeRpg([workout], 'saitama').xp).toBe(0)
    })
  }
  it('awards only the active character without merging daily and weekly rewards', () => {
    const goku = animeSessionSnapshot({ animeAscension: { path: 'goku' }, routines: [{ id: 'g', name: 'Goku · Saiyan Foundation B — Power' }] }, ['g'], planned)
    const jinwoo = animeSessionSnapshot({ animeAscension: { path: 'jinwoo' }, routines: [{ id: 'j', name: 'Sung Jinwoo · Hunter Foundation B — Agility' }] }, ['j'], planned)
    const w1 = { ...wk('g', '2026-10-13'), routineIds: ['g'], routineId: 'g', animeAscension: goku }
    const w2 = { ...wk('j', '2026-10-13'), routineIds: ['j'], routineId: 'j', animeAscension: jinwoo }
    const w3 = wk('s', '2026-10-13')
    for (const path of ['saitama', 'goku', 'jinwoo']) {
      expect(deriveAnimeRpg([w1, w2, w3], path).xp).toBe(180)
      expect(deriveAnimeRpg([w1, w2, w3], path).count).toBe(1)
    }
  })
})

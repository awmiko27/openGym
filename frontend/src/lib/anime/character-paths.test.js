import { describe, it, expect } from 'vitest'
import { buildGokuFoundation, buildJinwooFoundation, buildCharacterFoundation } from './character-paths.js'

const catalogue = [
  ['101', 'Wall Push Up', 'body weight'], ['102', 'Push Up', 'body weight'],
  ['103', 'Bodyweight Squat', 'body weight'], ['104', 'Glute Bridge', 'body weight'],
  ['105', 'Dead Bug', 'body weight'], ['106', 'Bird Dog', 'body weight'],
  ['107', 'Reverse Lunge', 'body weight'], ['108', 'Mountain Climber', 'body weight'],
  ['109', 'Standing Calf Raise', 'body weight'], ['110', 'One Arm Dumbbell Row', 'dumbbell'],
  ['111', 'Dumbbell Shoulder Press', 'dumbbell'], ['112', 'Incline Push Up on Bench', 'body weight'],
].map(([id, n, eq]) => ({ id, n, eq }))
const opts = (equipment, profile) => ({
  catalogue, uid: (() => { let i = 0; return () => `p${++i}` })(), equipment, profile,
  isAvailable: (kit, ex) => kit.includes(ex.eq) && (!ex.n.includes('Bench') || kit.includes('bench')),
})
const shapes = plan => plan.routines.map(r => r.ex.map(e => [e.id, e.sets, e.reps]))

for (const [path, build, names] of [
  ['goku', buildGokuFoundation, ['Turtle School Conditioning', 'Upper-Body Strength', 'Legs & Power Foundation', 'Martial Arts Conditioning']],
  ['jinwoo', buildJinwooFoundation, ['Quest: Push-ups', 'Quest: Squats & Core', 'Hunter Agility', 'Dungeon Strength', 'System Endurance']],
]) {
  describe(`${path} canon-inspired foundation`, () => {
    it('builds distinct character sessions on their own fixed weekdays', () => {
      const plan = build(opts(undefined, { experience: 'beginner' }))
      expect(plan.schedule.map(s => s.day)).toEqual(path === 'goku' ? [1, 2, 4, 5] : [1, 2, 4, 5, 6])
      expect(plan.routines.map(r => r.name.split(' — ').at(-1))).toEqual(names)
      expect(shapes(plan)[0]).not.toEqual(shapes(plan)[1])
      expect(shapes(plan)[1]).not.toEqual(shapes(plan)[2])
      expect(plan.routines.every(r => r.ex.length >= 3 && new Set(r.ex.map(e => e.id)).size === r.ex.length)).toBe(true)
      expect(plan.routines.flatMap(r => r.ex).every(e => catalogue.some(x => x.id === e.id))).toBe(true)
    })
    it('respects the openGym equipment restriction (no anime override)', () => {
      const filtered = build(opts(['body weight']))
      expect(filtered.routines.flatMap(r => r.ex).every(e => catalogue.find(x => x.id === e.id).eq === 'body weight')).toBe(true)
      expect(filtered.routines.flatMap(r => r.ex).some(e => e.id === '112')).toBe(false)
      const all = build(opts(undefined))
      expect(all.routines.flatMap(r => r.ex).some(e => e.id === '110')).toBe(true)
    })
    it('adjusts volumes by goal and experience; retains rep-based sets for RPG proof', () => {
      const beginner = build(opts(undefined, { experience: 'beginner', goal: 'general' }))
      const advanced = build(opts(undefined, { experience: 'advanced', goal: 'general' }))
      const endurance = build(opts(undefined, { experience: 'intermediate', goal: 'endurance' }))
      expect(advanced.routines[0].ex[0].reps).toBeGreaterThan(beginner.routines[0].ex[0].reps)
      expect(endurance.routines[0].ex[0].reps).toBeGreaterThan(beginner.routines[0].ex[0].reps)
      expect(advanced.routines.flatMap(r => r.ex).every(e => e.sets >= 2 && e.sets <= 4 && e.reps >= 5 && e.reps <= 18)).toBe(true)
    })
  })
}

describe('path safeguards', () => {
  it('fails closed on missing mandatory movements or unknown paths', () => {
    expect(buildCharacterFoundation('unknown', opts())).toBe(null)
    expect(buildGokuFoundation({ ...opts(), catalogue: catalogue.filter(e => e.id !== '103') })).toBe(null)
  })
  it('keeps valid exercises on every day with a minimal catalogue and no weights', () => {
    const minimal = catalogue.filter(e => ['101', '103', '104', '105'].includes(e.id))
    for (const build of [buildGokuFoundation, buildJinwooFoundation]) {
      const plan = build({ ...opts(), catalogue: minimal })
      expect(plan.routines.every(r => r.ex.length >= 3)).toBe(true)
    }
  })
})

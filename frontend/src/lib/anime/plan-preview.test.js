import { describe, it, expect } from 'vitest'
import { createAnimePlanPreview } from './plan-preview.js'
import { buildSaitamaFoundation } from './saitama.js'
import { buildCharacterFoundation } from './character-paths.js'

const catalogue = [
  ['101','Wall Push Up','body weight'], ['102','Push Up','body weight'],
  ['103','Bodyweight Squat','body weight'], ['104','Glute Bridge','body weight'],
  ['105','Dead Bug','body weight'], ['106','Bird Dog','body weight'],
  ['107','Reverse Lunge','body weight'], ['108','Mountain Climber','body weight'],
  ['109','Standing Calf Raise','body weight'], ['110','One Arm Dumbbell Row','dumbbell'],
  ['111','Dumbbell Shoulder Press','dumbbell'], ['112','Sit Up','body weight'],
].map(([id,n,eq]) => ({ id,n,eq }))
const isAvailable = (kit, ex) => kit.includes(ex.eq)
const build = (path, equipment, profile = {}) => createAnimePlanPreview({ path, catalogue, equipment, isAvailable, profile })

describe('Anime Ascension read-only plan preview', () => {
  it('shows the exact canonical days, exercise names, sets, reps and rest days', () => {
    for (const [path, count, rest] of [
      ['saitama', 5, ['Sunday','Wednesday']],
      ['goku', 4, ['Sunday','Wednesday','Saturday']],
      ['jinwoo', 5, ['Sunday','Wednesday']],
    ]) {
      const preview = build(path, ['body weight','dumbbell'], { experience:'beginner',trainingWeek:1 })
      expect(preview.workoutCount).toBe(count)
      expect(preview.days).toHaveLength(count)
      expect(preview.restDays).toEqual(rest)
      expect(preview.days.every(day => day.exercises.length > 0 && day.weekday)).toBe(true)
      expect(preview.days.flatMap(day => day.exercises).every(e =>
        e.name && e.sets >= 2 && e.reps >= 5 && catalogue.some(x => x.id === e.id))).toBe(true)
      expect(preview.totalWorkingSets).toBe(preview.days.reduce((sum, day) => sum + day.workingSets, 0))
    }
  })
  it('renders the same prescriptions as the native starter-plan builders', () => {
    for (const path of ['saitama','goku','jinwoo']) {
      const profile = { experience: 'intermediate', goal: 'endurance', trainingWeek: 4 }
      const options = { catalogue, equipment: ['body weight','dumbbell'], isAvailable, profile, uid: (() => {let i=0;return () => `id-${++i}`})() }
      const plan = path === 'saitama' ? buildSaitamaFoundation(options) : buildCharacterFoundation(path, options)
      const preview = build(path, options.equipment, profile)
      expect(preview.week).toBe(4)
      expect(preview.days.map(d => d.exercises.map(e => [e.id,e.sets,e.reps])))
        .toEqual(plan.routines.map(r => r.ex.map(e => [e.id,e.sets,e.reps])))
    }
  })
  it('honors only openGym equipment eligibility, not an anime equipment switch', () => {
    const allowed = build('goku', ['body weight'])
    expect(allowed.days.flatMap(d => d.exercises).every(e => e.equipment === 'body weight')).toBe(true)
    const all = build('goku', null)
    expect(all.days.flatMap(d => d.exercises).some(e => e.equipment === 'dumbbell')).toBe(true)
  })
  it('fails without creating a misleading partial preview', () => {
    expect(build('invalid', null)).toBe(null)
    expect(createAnimePlanPreview({ path:'saitama',catalogue:[] })).toBe(null)
    expect(createAnimePlanPreview({ path:'goku',catalogue:catalogue.filter(ex => ex.id !== '103') })).toBe(null)
  })
})

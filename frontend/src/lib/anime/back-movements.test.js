import { describe, it, expect } from 'vitest'
import { chooseBackMovements } from './back-movements.js'
import { buildSaitamaFoundation } from './saitama.js'
import { buildCharacterFoundation } from './character-paths.js'
import { createAnimePlanPreview } from './plan-preview.js'

const catalogue = [
  ['101', 'Wall Push Up', 'body weight'], ['102', 'Push Up', 'body weight'],
  ['103', 'Bodyweight Squat', 'body weight'], ['104', 'Glute Bridge', 'body weight'],
  ['105', 'Dead Bug', 'body weight'], ['106', 'Bird Dog', 'body weight'],
  ['107', 'Reverse Lunge', 'body weight'], ['108', 'Mountain Climber', 'body weight'],
  ['109', 'Standing Calf Raise', 'body weight'], ['110', 'One Arm Dumbbell Row', 'dumbbell'],
  ['111', 'Dumbbell Shoulder Press', 'dumbbell'], ['112', 'Sit Up', 'body weight'],
  ['113', 'Lying Prone W to T', 'body weight'], ['114', 'Band Standing Row', 'band'],
  ['115', 'Cable Seated Row', 'cable'], ['116', 'Inverted Row', 'body weight'],
].map(([id, n, eq]) => ({ id, n, eq }))
const available = (equipment, ex) => equipment.includes(ex.eq)
const settings = equipment => ({ catalogue, equipment, isAvailable: available,
  uid: (() => { let i = 0; return () => `r-${++i}` })(),
  profile: { experience: 'beginner', goal: 'general', trainingWeek: 1 } })
const ids = routine => routine.ex.map(row => row.id)

describe('exercise quality without changing verified-workout schemas', () => {
  it('prefers resistance rows, then safe prone accessory work, without guessing bar access', () => {
    expect(chooseBackMovements(catalogue, ex => ['body weight', 'dumbbell'].includes(ex.eq)).row?.id).toBe('110')
    expect(chooseBackMovements(catalogue, ex => ['body weight', 'band'].includes(ex.eq)).row?.id).toBe('114')
    expect(chooseBackMovements(catalogue, ex => ['body weight', 'cable'].includes(ex.eq)).row?.id).toBe('115')
    const body = chooseBackMovements(catalogue, ex => ex.eq === 'body weight')
    expect(body.row).toBeNull()
    expect(body.primary?.id).toBe('113')
    expect(body.primary?.id).not.toBe('116') // requires an anchor, even if called body weight
  })
  it('includes available upper-back movements without skipping equipment restrictions', () => {
    for (const path of ['saitama', 'goku', 'jinwoo']) {
      const build = path === 'saitama' ? buildSaitamaFoundation : args => buildCharacterFoundation(path, args)
      const weighted = build(settings(['body weight', 'dumbbell']))
      const body = build(settings(['body weight']))
      const band = build(settings(['body weight', 'band']))
      expect(weighted.routines.flatMap(ids)).toContain('110')
      expect(body.routines.flatMap(ids)).toContain('113')
      expect(body.routines.flatMap(ids)).not.toContain('110')
      expect(body.routines.flatMap(ids)).not.toContain('116')
      expect(band.routines.flatMap(ids)).toContain('114')
      expect(weighted.routines.every(r => r.ex.length >= 3)).toBe(true)
      expect(body.routines.flatMap(r => r.ex).every(row =>
        catalogue.find(ex => ex.id === row.id)?.eq === 'body weight')).toBe(true)
      expect(body.routines.every(r => new Set(ids(r)).size === r.ex.length)).toBe(true)
    }
  })
  it('keeps the 5/4/5 schedule and theme distinctions, but provides honest equipment guidance', () => {
    for (const [path, sessions] of [['saitama', 5], ['goku', 4], ['jinwoo', 5]]) {
      const body = createAnimePlanPreview({ path, ...settings(['body weight']) })
      const loaded = createAnimePlanPreview({ path, ...settings(['body weight', 'dumbbell']) })
      expect(body.days).toHaveLength(sessions)
      expect(body.backBalanceNote).toContain('do not replace pulling')
      expect(loaded.backBalanceNote).toBeNull()
      expect(body.days.every(d => d.exercises.length >= 3)).toBe(true)
      expect(loaded.days.every(d => d.exercises.length >= 3)).toBe(true)
      expect(body.days.flatMap(d => d.exercises).every(e =>
        e.sets >= 2 && e.sets <= 4 && e.reps >= 5 && e.reps <= 20)).toBe(true)
    }
    const s = buildSaitamaFoundation(settings(['body weight', 'dumbbell']))
    expect(ids(s.routines[0])[0]).toBe('101') // baseline stays a push-up
    expect(ids(s.routines[2])).not.toContain('103') // run-prep day is not another squat day
    const g = buildCharacterFoundation('goku', settings(['body weight', 'dumbbell']))
    expect(ids(g.routines[0])[0]).toBe('103') // baseline stays a squat
    expect(ids(g.routines[3])).not.toContain('103') // conditioning uses a lunge rather than another squat
    const j = buildCharacterFoundation('jinwoo', settings(['body weight', 'dumbbell']))
    expect(ids(j.routines[0])[0]).toBe('101') // baseline stays a push-up
    expect(ids(j.routines[4])).not.toContain('103') // endurance avoids another squat
  })
})

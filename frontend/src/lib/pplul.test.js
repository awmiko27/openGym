import { describe, it, expect } from 'vitest'
import { buildPplulPlan, PPLUL_DAYS } from './pplul.js'

// Real OpenGym catalogue IDs; small deterministic subset with their equipment.
const EQ = {
  '0025': 'barbell', '0289': 'dumbbell', '0314': 'dumbbell', '0405': 'dumbbell',
  '0334': 'dumbbell', '0241': 'cable', '0201': 'cable', '0200': 'cable',
  '7583': 'cable', '2330': 'cable', '0652': 'body weight',
  '9698': 'dumbbell', '5661': 'dumbbell', '2393': 'dumbbell', '0293': 'dumbbell',
  '0383': 'dumbbell', '2487': 'dumbbell', '0447': 'ez barbell', '0294': 'dumbbell',
  '0313': 'dumbbell', '0043': 'barbell', '3593': 'barbell', '0085': 'barbell',
  '0381': 'dumbbell', '0676': 'body weight', '0586': 'leverage machine',
  '0599': 'leverage machine', '0605': 'leverage machine', '0417': 'dumbbell',
  '0227': 'cable', '0662': 'body weight', '2188': 'dumbbell', '6148': 'dumbbell',
  '0318': 'dumbbell', '2224': 'sled machine', '0585': 'leverage machine', '1873': 'leverage machine',
  '0739': 'sled machine', '2290': 'dumbbell', '0175': 'cable', '5741': 'cable', '11270': 'cable',
}
const catalogue = Object.entries(EQ).map(([id, eq]) => ({ id, n: id, eq, bp: 'strength' }))
const build = (equipment, overrides = {}) => buildPplulPlan({
  catalogue, uid: (() => { let n = 0; return () => `pplul-${++n}` })(),
  equipment, isAvailable: (kit, ex) => kit.includes(ex.eq) && (ex.id !== '0652' || kit.includes('pull-up bar')),
  ...overrides,
})

describe('OpenGym native PPLUL starter', () => {
  it('loads Mon–Fri only, has distinct valid exercises and no anime proof fields', () => {
    const plan = build()
    expect(plan.schedule.map(x => x.day)).toEqual([1, 2, 3, 4, 5])
    expect(PPLUL_DAYS.map(x => x.key)).toEqual(['Push', 'Pull', 'Legs A', 'Upper', 'Lower B'])
    expect(plan.routines.map(r => r.ex.length)).toEqual([5, 6, 5, 7, 6])
    for (const routine of plan.routines) {
      expect(routine.animeAscension).toBeUndefined()
      expect(new Set(routine.ex.map(e => e.id)).size).toBe(routine.ex.length)
      for (const ex of routine.ex) {
        expect(EQ[ex.id]).toBeTruthy()
        expect(ex.weight).toBe(0)
        expect(ex.sets).toBeGreaterThan(0)
        expect(ex.note).toMatch(/reps.*RIR.*rest/)
      }
    }
    expect(plan.routines[0].ex[0]).toMatchObject({ id: '0025', sets: 3, reps: 4 })
    expect(plan.routines[0].ex[0].note).toContain('4–6 reps · 2 RIR · 3 min rest')
    expect(plan.routines[2].ex[2].note).toContain('per leg')
    expect(plan.routines[4].ex[1].note).toContain('8–12 reps per leg · 2 RIR · 2 min rest')
    expect(plan.routines[4].ex.map(e => e.id)).toEqual(['2224', '2290', '0585', '0599', '0605', '0175'])
    expect(plan.routines[4].ex.map(e => e.sets)).toEqual([3, 2, 2, 3, 3, 2])
    expect(plan.routines[4].ex[0].note).toContain('8–12 reps · 2 RIR · 2–3 min rest')
    expect(plan.routines[4].ex[2].note).toContain('10–15 reps · 1–2 RIR · 90 sec rest')
    expect(plan.routines[4].ex[3].note).toContain('10–15 reps · 1–2 RIR · 90 sec rest')
    expect(plan.routines[4].ex[4].note).toContain('12–20 reps · 1–2 RIR · 60–90 sec rest')
    expect(plan.routines[4].ex[5].note).toContain('10–15 reps · 1–2 RIR · 60–90 sec rest')
  })
  it('uses only permitted variants; does not blindly fit unrelated exercises', () => {
    const kit = ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine']
    const plan = build(kit)
    expect(plan).toBeTruthy()
    expect(plan.routines[1].ex[4].id).toBe('0294') // EZ bar not selected
    expect(plan.routines[4].ex[0].id).toBe('2224') // actual leg press, not a squat substitute
    expect(plan.routines.flatMap(r => r.ex).every(e => kit.includes(EQ[e.id]))).toBe(true)
    const alternate = build(kit, { catalogue: catalogue.filter(e => !['2224', '0585', '0175'].includes(e.id)) })
    expect(alternate.routines[4].ex.map(e => e.id)).toEqual(['0739', '2290', '1873', '0599', '0605', '5741'])
  })
  it('fails without a required exercise or equipment instead of creating a partial plan', () => {
    expect(build(['body weight'])).toBeNull()
    expect(build(['barbell', 'dumbbell', 'cable', 'leverage machine'])).toBeNull() // no leg press
    expect(build(undefined, { catalogue: catalogue.filter(x => x.id !== '0314') })).toBeNull()
    expect(build(undefined, { catalogue: [] })).toBeNull()
  })
  it('respects the catalogue cardio exclusion and uses real ID references', () => {
    const filtered = catalogue.map(e => e.id === '0025' ? { ...e, bp: 'cardio' } : e)
    const fallback = build(undefined, { catalogue: filtered })
    expect(fallback.routines[0].ex[0].id).toBe('0289')
    expect(build(undefined, { catalogue: filtered.filter(e => e.id !== '0289') })).toBeNull()
  })
})

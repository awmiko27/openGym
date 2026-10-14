import { test } from 'vitest'
import assert from 'node:assert/strict'
import { buildSaitamaFoundation, saitamaDifficulty, SAITAMA_DAYS } from './saitama.js'

const catalogue = [
  ['100', 'Wall Push Up', 'body weight'],
  ['101', 'Bodyweight Squat', 'body weight'],
  ['102', 'Glute Bridge', 'body weight'],
  ['103', 'Dead Bug', 'body weight'],
  ['104', 'Bird Dog', 'body weight'],
  ['105', 'One Arm Dumbbell Row', 'dumbbell'],
  ['106', 'Barbell Back Squat', 'barbell'],
  ['107', 'Reverse Lunge', 'body weight'],
  ['108', 'Mountain Climber', 'body weight'],
  ['109', 'Standing Calf Raise', 'body weight'],
  ['110', 'Push Up', 'body weight'],
  ['111', 'Incline Push Up on Bench', 'body weight'],
].map(([id, n, eq]) => ({ id, n, eq }))
const build = (equipment, profile = {}) => {
  let i = 0
  return buildSaitamaFoundation({ catalogue, uid: () => `new-${++i}`, equipment, profile,
    isAvailable: (kit, ex) => kit.includes(ex.eq) || (ex.eq === 'body weight' &&
      (!ex.n.includes('Bench') || kit.includes('bench'))) })
}
const refs = plan => plan.routines.map(r => r.ex.map(x => x.id))
const shape = plan => plan.routines.map(r => r.ex.map(x => [x.id, x.sets, x.reps]))

test('three distinct strength/endurance/conditioning routines retain native openGym schema', () => {
  const plan = build(['body weight'])
  assert.deepEqual(plan.schedule.map(x => x.day), [1, 3, 5])
  assert.deepEqual(SAITAMA_DAYS.map(x => x.focus), ['Strength', 'Endurance', 'Conditioning'])
  assert.deepEqual(plan.routines.map(r => r.name), [
    'Saitama · Hero Foundation A — Strength',
    'Saitama · Hero Foundation B — Endurance',
    'Saitama · Hero Foundation C — Conditioning',
  ])
  assert.notDeepEqual(shape(plan)[0], shape(plan)[1])
  assert.notDeepEqual(shape(plan)[1], shape(plan)[2])
  assert.ok(refs(plan)[1].includes('107'))
  assert.ok(refs(plan)[2].includes('108'))
  assert.ok(refs(plan)[2].includes('109'))
  for (const r of plan.routines) {
    assert.ok(r.ex.length >= 4)
    assert.equal(new Set(r.ex.map(x => x.id)).size, r.ex.length)
    assert.ok(r.ex.every(x => x.sets > 0 && x.reps > 0 && x.weight === 0))
  }
})

test('only the openGym equipment restriction controls allowed exercises', () => {
  const filtered = build(['body weight'])
  const everything = build(undefined)
  assert.ok(filtered.routines.every(r => r.ex.every(x => x.id !== '105')))
  assert.ok(everything.routines[0].ex.some(x => x.id === '105'))
  const withDumbbells = build(['dumbbell'])
  assert.ok(withDumbbells.routines[0].ex.some(x => x.id === '105'))
  assert.ok(build(['body weight']).routines.every(r => r.ex.every(x => x.id !== '111')))
})

test('experience and goal adjust actual volumes without excessive sets/reps', () => {
  const beginner = build(undefined, { experience: 'beginner', goal: 'general', ageYears: 25 })
  const advanced = build(undefined, { experience: 'advanced', goal: 'general', ageYears: 25 })
  const strength = build(undefined, { experience: 'intermediate', goal: 'strength', ageYears: 25 })
  const endurance = build(undefined, { experience: 'intermediate', goal: 'endurance', ageYears: 25 })
  assert.ok(advanced.routines[0].ex[0].sets > beginner.routines[0].ex[0].sets)
  assert.ok(advanced.routines[0].ex[0].reps > beginner.routines[0].ex[0].reps)
  assert.ok(endurance.routines[1].ex[0].reps > strength.routines[1].ex[0].reps)
  assert.ok(strength.routines[0].ex[0].sets >= endurance.routines[0].ex[0].sets)
  assert.ok(shape(advanced).flat().every(([, sets, reps]) => sets <= 4 && reps <= 18))
})

test('higher age caps advanced volume conservatively without changing experience setting', () => {
  assert.equal(saitamaDifficulty({ experience: 'advanced', ageYears: 74 }).tier, 1)
  assert.equal(saitamaDifficulty({ experience: 'advanced', ageYears: 40 }).tier, 2)
  const older = build(undefined, { experience: 'advanced', ageYears: 75 })
  const intermediate = build(undefined, { experience: 'intermediate', ageYears: 40 })
  assert.deepEqual(shape(older), shape(intermediate))
})

test('fails closed for missing mandatory movements and never invents exercise IDs', () => {
  const invalid = buildSaitamaFoundation({ catalogue: catalogue.filter(x => x.id !== '101'), uid: () => 'x' })
  assert.equal(invalid, null)
  const plan = build([])
  assert.ok(plan)
  for (const r of plan.routines) for (const ex of r.ex) assert.ok(catalogue.find(x => x.id === ex.id))
  assert.equal(new Set(plan.routines.map(r => r.id)).size, 3)
})

test('optional conditioning movements missing from a minimal catalogue do not invalidate the plan', () => {
  const minimal = catalogue.filter(x => ['100', '101', '102', '103'].includes(x.id))
  const result = buildSaitamaFoundation({ catalogue: minimal, uid: (() => { let i = 0; return () => '' + ++i })() })
  assert.ok(result)
  assert.ok(result.routines.every(r => r.ex.length === 4))
})

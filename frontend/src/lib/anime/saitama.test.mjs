import { test } from 'vitest'
import assert from 'node:assert/strict'
import { buildSaitamaFoundation } from './saitama.js'

const catalogue = [
  ['100','Wall Push Up','body weight'],
  ['101','Bodyweight Squat','body weight'],
  ['102','Glute Bridge','body weight'],
  ['103','Dead Bug','body weight'],
  ['104','Bird Dog','body weight'],
  ['105','One Arm Dumbbell Row','dumbbell'],
  ['106','Barbell Back Squat','barbell'],
].map(([id,n,eq]) => ({id,n,eq}))
const build = equipment => {
  let i = 0
  return buildSaitamaFoundation({catalogue, uid:() => `new-${++i}`, equipment,
    isAvailable: (items, ex) => ex.eq === 'body weight' || items.includes(ex.eq) })
}

test('bodyweight-only produces three playable routines with no dumbbells or barbells', () => {
  const result = build(['body weight'])
  assert.equal(result.routines.length, 3)
  assert.deepEqual(result.schedule.map(s => s.day), [1,3,5])
  for (const routine of result.routines) {
    assert.ok(routine.ex.length >= 4)
    for (const movement of routine.ex) {
      assert.equal(catalogue.find(x => x.id === movement.id).eq, 'body weight')
      assert.ok(movement.sets >= 1 && movement.reps >= 1)
    }
  }
})

test('dumbbells add pulling work only when available', () => {
  const bw = build(['body weight'])
  const mixed = build(['body weight','dumbbell'])
  assert.ok(mixed.routines.every(r => r.ex.some(ex => ex.id === '105')))
  assert.ok(bw.routines.every(r => r.ex.every(ex => ex.id !== '105')))
})

test('without a configured equipment profile, the prototype stays bodyweight-only', () => {
  const plan = build()
  assert.ok(plan.routines.every(r => r.ex.every(ex => ex.id !== '105')))
})

test('missing required exercise fails closed, not unknown IDs', () => {
  const result = buildSaitamaFoundation({catalogue: catalogue.filter(ex => ex.id !== '100'), uid:() => 'id'})
  assert.equal(result, null)
})

test('all three generated routines have unique IDs', () => {
  const ids = build().routines.map(r => r.id)
  assert.equal(new Set(ids).size, 3)
})

// Regression: catalogue entries marked "body weight" can still need accessories.
test('rejects a bodyweight push-up that requires an unavailable bench', () => {
  const benchOnly = [
    ...catalogue.filter(ex => ex.id !== '100'),
    { id: '009', n: 'Incline Push Up on Bench', eq: 'body weight' },
  ]
  const noBench = buildSaitamaFoundation({
    catalogue: benchOnly, uid: () => 'x', equipment: [],
    isAvailable: (_kit, ex) => ex.id !== '009',
  })
  assert.equal(noBench, null)
})

test('no unlisted equipment is used by a generated routine', () => {
  for (const equipment of [[], ['dumbbell']]) {
    const plan = build(equipment)
    assert.ok(plan)
    for (const r of plan.routines) for (const ex of r.ex) {
      const entry = catalogue.find(item=>item.id===ex.id)
      assert.ok(entry.eq==='body weight' || equipment.includes(entry.eq))
    }
  }
})

import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { registerPhase4PlanCopy } from './repair-anime-ascension-phase4-plan-copy.mjs'

const fixture = newline => [
  'const PLAN_COPY = {',
  "  'saitama-foundation': () => ({ name: t('Saitama'), about: t('Training') }),",
  "  ppl: () => ({ name: t('Push / Pull / Legs'), about: t('Plan') }),",
  '}',
  'export function loadStarterPlan(planId, profile, animeProfile) {',
  '  const plan = buildStarterPlan(planId, profile, animeProfile)',
  '  if (!plan) return false',
  '  update(st => { st.routines.push(...plan.routines) })',
  "  if (plan.fit) toast(t('{0} fitted', PLAN_COPY[planId]().name))",
  "  else toast(t('{0} loaded', PLAN_COPY[planId]().name))",
  '  return true',
  '}',
].join(newline) + newline

for (const newline of ['\n', '\r\n']) {
  test(`registers both new plan names, preserves native plans and is repeatable (${JSON.stringify(newline)})`, () => {
    const original = fixture(newline)
    const changed = registerPhase4PlanCopy(original)
    assert.equal(changed.changed, true)
    assert.match(changed.source, /'goku-foundation': \(\) =>/)
    assert.match(changed.source, /'jinwoo-foundation': \(\) =>/)
    assert.match(changed.source, /'saitama-foundation': \(\) =>/)
    assert.match(changed.source, /update\(st => \{ st\.routines\.push/)
    const again = registerPhase4PlanCopy(changed.source)
    assert.equal(again.changed, false)
    assert.equal(again.source, changed.source)
  })
}

test('rejects partial character registration rather than silently editing', () => {
  const src = fixture('\n').replace("  ppl: ()", "  'goku-foundation': () => ({ name: 'Goku' }),\n  ppl: ()")
  assert.throws(() => registerPhase4PlanCopy(src), /Only one Phase 4/)
})

test('rejects an unexpected plan registry', () => {
  assert.throws(() => registerPhase4PlanCopy('const other = {}'), /exactly one PLAN_COPY/)
})

test('refuses insertion without the native toast lookup', () => {
  const src = fixture('\n').replaceAll('PLAN_COPY[planId]().name', 'planId')
  assert.throws(() => registerPhase4PlanCopy(src), /Expected openGym loadStarterPlan/)
})

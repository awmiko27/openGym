#!/usr/bin/env node
// Idempotent source integration for openGym v1.4.0. No network or dependencies.
// A separate installer lets us fail safely when upstream source drifts.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const starterFile = path.join(root, 'frontend/src/lib/starter.js')
const sheetFile = path.join(root, 'frontend/src/sheets.jsx')
const paths = [starterFile, sheetFile]
for (const file of paths) {
  if (!fs.existsSync(file)) throw new Error(`Missing upstream source: ${file}. Run from the openGym repository root.`)
}
let starter = fs.readFileSync(starterFile, 'utf8')
let sheet = fs.readFileSync(sheetFile, 'utf8')
const replaceOnce = (body, needle, replacement, description) => {
  if (!body.includes(needle)) throw new Error(`${description}: upstream source differs; files unchanged. Check v1.4.0.`)
  return body.replace(needle, replacement)
}
if (!starter.includes("import { buildSaitamaFoundation } from './anime/saitama.js'")) {
  const line = "import { eqAvailable, ALL_EQUIPMENT } from './equipment.js'"
  starter = replaceOnce(starter, line, line + "\nimport { buildSaitamaFoundation } from './anime/saitama.js'", 'Import anchor')
}
if (!starter.includes("{ id: 'saitama-foundation', days: 3 }")) {
  const line = 'Object.entries(PLANS).map(([id, { schedule }]) => ({ id, days: schedule.length }))'
  starter = replaceOnce(starter, line,
    "[...Object.entries(PLANS).map(([id, { schedule }]) => ({ id, days: schedule.length })),\n  { id: 'saitama-foundation', days: 3 }]", 'Plan picker anchor')
}
if (!starter.includes("id === 'saitama-foundation' ? [1, 3, 5]")) {
  const line = 'export const starterPlanDays = id => PLANS[id]?.schedule.map(([day]) => day) ?? null'
  starter = replaceOnce(starter, line,
    "export const starterPlanDays = id => id === 'saitama-foundation' ? [1, 3, 5]\n  : PLANS[id]?.schedule.map(([day]) => day) ?? null", 'Schedule anchor')
}
if (!starter.includes("if (id === 'saitama-foundation') return buildSaitamaFoundation(")) {
  const line = 'export const buildStarterPlan = (id, equipment) => {'
  starter = replaceOnce(starter, line, line + `
if (id === 'saitama-foundation') return buildSaitamaFoundation({
  catalogue: Object.values(EXIDX), uid, equipment,
  isAvailable: eqAvailable,
})`, 'Builder anchor')
}
if (!sheet.includes("'saitama-foundation': () =>")) {
  const match = sheet.match(/(^[ \t]*'5x5':[ \t]*\(\)[ \t]*=>[ \t]*\(\{[^\n]+\}\),?[ \t]*$)/m)
  if (!match) throw new Error('Starter sheet PLAN_COPY anchor changed; files unchanged. Check v1.4.0.')
  const line = match[1].replace(/,[ \t]*$/, '')
  sheet = sheet.replace(match[1], line + `,
'saitama-foundation': () => ({ name: t('Saitama · Hero Foundation'), about: t('Beginner-friendly hero training, three days per week.') }),`)
}
// No writing happens until all integration anchors are validated.
fs.writeFileSync(starterFile, starter)
fs.writeFileSync(sheetFile, sheet)
console.log('Anime Ascension Saitama starter integrated. Review: git diff -- frontend/src/lib/starter.js frontend/src/sheets.jsx')

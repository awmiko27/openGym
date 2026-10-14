#!/usr/bin/env node
// Add the Phase 3.1 reward UI to the verified Phase 3 fork without changing
// the workout engine. Validate both targets before writing either file.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const targets = ['frontend/src/views/Workout.jsx', 'frontend/src/sheets.jsx']
const current = new Map(targets.map(file => {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) throw Error(`Missing ${file}; run from openGym repository root.`)
  return [file, fs.readFileSync(full, 'utf8')]
}))
const pending = new Map()
function insertWithin(file, from, to, insertionAnchor, importStatement, widget, importAnchor) {
  let src = current.get(file)
  const hasImport = src.includes(importStatement)
  const hasWidget = src.includes(widget)
  if (hasImport !== hasWidget) throw Error(`Partial XP integration in ${file}; inspect the diff before retrying.`)
  if (hasWidget) return
  const starts = [...src.matchAll(from)]
  if (starts.length !== 1) throw Error(`Expected one target component in ${file}; no changes written.`)
  const start = starts[0].index
  const end = src.indexOf(to, start + 1)
  if (end < 0) throw Error(`Cannot find end of target component in ${file}; no changes written.`)
  const body = src.slice(start, end)
  const anchors = body.split(insertionAnchor)
  if (anchors.length !== 2) throw Error(`Expected one stable UI insertion point in ${file}; no changes written.`)
  src = src.slice(0, start) + body.replace(insertionAnchor, `    ${widget}\n${insertionAnchor}`) + src.slice(end)
  if (!src.includes(importAnchor)) throw Error(`Missing expected module import in ${file}; no changes written.`)
  src = src.replace(importAnchor, importStatement + '\n' + importAnchor)
  pending.set(file, src)
}
insertWithin(
  'frontend/src/views/Workout.jsx',
  /^function ActiveWorkout\(\)\s*\{/gm,
  '\nexport default function Workout()',
  '    {editing && <p className="muted small">',
  "import { AnimeWorkoutRewards } from '../components/anime/AnimeWorkoutRewards.jsx'",
  '<AnimeWorkoutRewards active={A} workouts={S.workouts} />',
  "import FocusView from './FocusView.jsx'",
)
insertWithin(
  'frontend/src/sheets.jsx',
  /^function FinishSummary\(\{\s*w,\s*prs,\s*e1prs\s*=\s*\[\],\s*close\s*\}\)\s*\{/gm,
  '\nexport function finishWorkout()',
  '    <LastAndNext st={st} w={w} />',
  "import { AnimeCompletedRewards } from './components/anime/AnimeWorkoutRewards.jsx'",
  '<AnimeCompletedRewards workout={w} workouts={st.workouts} />',
  "import { useStore } from './store/useStore.js'",
)
// Validate all targets before writes. Atomic rename avoids truncated files.
for (const [file, content] of pending) {
  const full = path.join(root, file)
  const temp = `${full}.aa-xp.tmp`
  fs.writeFileSync(temp, content)
  fs.renameSync(temp, full)
}
console.log(pending.size ? `Anime Ascension XP UI installed in ${pending.size} files.` : 'Anime Ascension XP UI already installed.')

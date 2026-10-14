#!/usr/bin/env node
// Phase 3 integration, pinned to the installed Phase 2 on openGym v1.4.0.
// Validates ALL expected source contexts before writing a single file.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = [
  'frontend/src/App.jsx',
  'frontend/src/sheets.jsx',
  'frontend/src/lib/finish-workout.js',
  'frontend/src/views/AnimeAscension.jsx',
  'frontend/src/views/AnimeRPG.jsx',
  'frontend/src/lib/anime/rpg.js',
  'frontend/src/anime-rpg.css',
]
const orig = new Map(files.map(file => {
  const fp = path.join(root, file)
  if (!fs.existsSync(fp)) throw new Error(`Missing ${file}. Apply Phase 3 patch and Phase 2 installer first.`)
  return [file, fs.readFileSync(fp, 'utf8')]
}))
const changed = new Map()
function insert(file, marker, anchor, replacement) {
  const src = changed.get(file) ?? orig.get(file)
  if (src.includes(marker)) return
  if (src.split(anchor).length !== 2) throw Error(`Unexpected source in ${file}: expected unique anchor ${JSON.stringify(anchor.slice(0, 75))}. Nothing changed.`)
  changed.set(file, src.replace(anchor, replacement))
}
const app = 'frontend/src/App.jsx'
const sheets = 'frontend/src/sheets.jsx'
const finish = 'frontend/src/lib/finish-workout.js'
if (!orig.get(app).includes('AnimeAscension') || !orig.get(app).includes('path="/anime"')) {
  throw Error('Phase 2 navigation missing. No files changed.')
}
insert(app,
  "import AnimeRPG from './views/AnimeRPG.jsx'",
  "import AnimeAscension from './views/AnimeAscension.jsx'",
  "import AnimeAscension from './views/AnimeAscension.jsx'\nimport AnimeRPG from './views/AnimeRPG.jsx'\nimport './anime-rpg.css'")
insert(app,
  '<Route path="/anime/rpg" element={<AnimeRPG />} />',
  '<Route path="/anime" element={<AnimeAscension />} />',
  '<Route path="/anime" element={<AnimeAscension />} />\n               <Route path="/anime/rpg" element={<AnimeRPG />} />')
insert(sheets,
  "import { animeActiveFields } from './lib/anime/rpg.js'",
  "import { buildCompletedWorkout, sessionEnd } from './lib/finish-workout.js'",
  "import { buildCompletedWorkout, sessionEnd } from './lib/finish-workout.js'\nimport { animeActiveFields } from './lib/anime/rpg.js'")
// Only patch beginWorkout's live-session object. `entries` occurs elsewhere in
// sheets.jsx (repeat, backfill), so a global replacement is unsafe.
function insertLiveWorkoutSnapshot() {
  const src = changed.get(sheets) ?? orig.get(sheets)
  const fn = /export\s+function\s+beginWorkout\s*\(\s*routineIds\s*,\s*bw\s*\)\s*\{/g
  const hits = [...src.matchAll(fn)]
  if (hits.length !== 1) throw Error('Expected one beginWorkout(routineIds, bw) in sheets.jsx. Nothing changed.')
  const start = hits[0].index
  const next = src.indexOf('export function repeatWorkout(', start)
  if (next < 0) throw Error('Cannot delimit beginWorkout in sheets.jsx. Nothing changed.')
  const segment = src.slice(start, next)
  const marker = '...animeActiveFields(st, rids, entries),'
  if (segment.includes(marker)) return // Safe to rerun the installer.
  const active = segment.indexOf('s.active = {')
  if (active < 0) throw Error('No live session object in beginWorkout. Nothing changed.')
  // The workoutView field is in the same object in openGym v1.4.x. Add the
  // extra field after it, preserving the upstream comment describing layout.
  const tail = segment.slice(active)
  const line = /^([ \t]*)workoutView\s*:[^\n]*,\r?\n/gm
  const matches = [...tail.matchAll(line)]
  if (matches.length !== 1 || matches[0].index > 1200) {
    throw Error('Cannot locate workoutView in the live session object. Nothing changed.')
  }
  const match = matches[0]
  const at = active + match.index + match[0].length
  const added = `${match[1]}${marker}\n`
  const updated = segment.slice(0, at) + added + segment.slice(at)
  changed.set(sheets, src.slice(0, start) + updated + src.slice(next))
}
insertLiveWorkoutSnapshot()
insert(finish,
  "import { animeSessionProof } from './anime/rpg.js'",
  "import { bestWeightForEntry, cleanupSg } from './history.js'",
  "import { bestWeightForEntry, cleanupSg } from './history.js'\nimport { animeSessionProof } from './anime/rpg.js'")
// Bind the proof to the persisted-workout builder, not to an exact comment or
// allNoProg layout. Upstream has refactored the return object in nearby versions.
function insertFinishedWorkoutProof() {
  const src = changed.get(finish) ?? orig.get(finish)
  const fn = /export\s+function\s+buildCompletedWorkout\s*\(/g
  const matches = [...src.matchAll(fn)]
  if (matches.length !== 1) throw Error('Cannot find one buildCompletedWorkout() in finish-workout.js. Nothing changed.')
  const start = matches[0].index
  let segment = src.slice(start)
  const declaration = 'const animeAscension = animeSessionProof(active)'
  const persisted = '...(animeAscension ? { animeAscension } : {}),'
  if (!segment.includes(declaration)) {
    const entries = /^([ \t]*)const entries\s*=.*$/gm
    const hits = [...segment.matchAll(entries)]
    if (hits.length !== 1) throw Error('Cannot locate unique completed workout entries declaration. Nothing changed.')
    const hit = hits[0]
    const at = hit.index
    segment = segment.slice(0, at) + hit[1] + declaration + '\n' + segment.slice(at)
  }
  if (!segment.includes(persisted)) {
    // Only the top-level finished workout has a standalone `prs,` property.
    // Do not match prs inside an array or nested exercise entry.
    const prs = /^([ \t]*)prs,\s*$/gm
    const hits = [...segment.matchAll(prs)]
    if (hits.length !== 1) throw Error('Cannot locate unique saved workout prs property. Nothing changed.')
    const hit = hits[0]
    const at = hit.index + hit[0].length
    segment = segment.slice(0, at) + '\n' + hit[1] + persisted + segment.slice(at)
  }
  if (segment !== src.slice(start)) changed.set(finish, src.slice(0, start) + segment)
}
insertFinishedWorkoutProof()
if (!orig.get('frontend/src/views/AnimeAscension.jsx').includes('navigate(\'/anime/rpg\')')) {
  throw Error('Phase 3 Anime Ascension UI not applied. No files changed.')
}
if (!changed.size) { console.log('Phase 3 already integrated.'); process.exit(0) }
for (const [file, src] of changed) fs.writeFileSync(path.join(root, file), src)
console.log(`Phase 3 integrated in ${changed.size} openGym source files. Review git diff, then run npm test and npm run build in frontend/.`)

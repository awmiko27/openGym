// Anime Ascension MVP acceptance gate (read-only, no store changes).
// Run at the repo root: node scripts/anime-mvp-acceptance-audit.mjs
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHALLENGES } from '../frontend/src/lib/anime/challenges.js'
import { characterSessionCount } from '../frontend/src/lib/anime/canon-programs.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const asset = name => readFileSync(join(root, name), 'utf8')
const results=[]
const check=(title,ok,details='',severity='critical')=>results.push({title,ok,details,severity})

check('Three character paths with nine tier definitions',
  Object.keys(CHALLENGES).length===9 && ['saitama','goku','jinwoo'].every(p=>[7,14,30].every(d=>CHALLENGES[`${p}-${d}`])),
  'One 7-, 14-, and 30-day challenge per path.')
check('Character-specific weekly splits',
  characterSessionCount('saitama')===5 && characterSessionCount('goku')===4 && characterSessionCount('jinwoo')===5,
  'Saitama 5, Goku 4, Jinwoo 5 sessions.')

const engine=asset('frontend/src/lib/anime/challenge-mode.js')
const training=asset('frontend/src/lib/anime/training.js')
const ui=asset('frontend/src/views/AnimeChallenges.jsx')
const rpg=asset('frontend/src/lib/anime/rpg.js')
check('Challenge workout excluded from training-arc credit',
  training.includes('filter(w => !w.animeAscension?.challengeId)'),
  'Arc progress filters challenge-tagged workouts.')
check('Protect switching during an active workout',
  engine.includes('state.active') && ui.includes('if (S.active)'),
  'Both UI and core entry points check active sessions.')
check('Challenge templates are cleaned up on exit',
  engine.includes('state.routines = (state.routines || []).filter') && engine.includes('state.week = week'),
  'Temporary routines are removed and calendar restored.')
check('RPG proof requires fully completed prescribed sets',
  rpg.includes('sets[n]?.done === true') && rpg.includes('Number(sets[n].r) >= Number(target)'),
  'Completed reps are compared to the frozen session prescription.')

// Verify actual workout sequencing in the isolated source-of-truth engine,
// rather than inspecting the old fixed-week template arithmetic. The script
// performs all nine tier attempts with session-specific IDs, stage swaps,
// proof-based completion, cancellation/restore, and idempotent replay.
const simulator = spawnSync(process.execPath, [join(root, 'scripts/phase5-mvp-challenge-check.mjs')],
  { encoding: 'utf8', timeout: 30000 })
const simulated = simulator.status === 0 && /9 per-session programs/.test(simulator.stdout)
check('Final boss prescribed ONLY at the final challenge session', simulated,
  simulated ? 'All 7-/14-/30-day character scenarios passed.' : (simulator.stderr || simulator.stdout || 'Challenge simulator failed.'),
  'release-blocker')

// The automatic completion exit uses an idempotent pure store transition and
// is triggered on returning to /anime once the current workout is finished.
const dashboard=asset('frontend/src/views/AnimeAscension.jsx')
check('Restoration after completion is automatic', simulated &&
    engine.includes('export function reconcileChallengeReturn(state)') &&
    dashboard.includes('reconcileChallengeReturn(st)') &&
    dashboard.includes('useEffect('),
  'Auto-restores on dashboard return with no active workout; keeps a manual finish fallback.',
  'release-blocker')

console.log('\nAnime Ascension MVP — read-only acceptance audit')
for(const r of results) console.log(`${r.ok?'PASS':'REVIEW'}  ${r.title}${r.ok?'':`\n        ${r.details}`}`)
console.log(`\n${results.filter(r=>r.ok).length}/${results.length} checks satisfied.`)
if(results.some(r=>!r.ok)) {
  console.error('MVP sign-off blocked by the REVIEW items. Existing functionality may still work; do not reset user data.')
  process.exitCode=1
}

/** Read-only coaching summary. Uses the same OpenGym progression that builds sessions.
 * No XP, no persisted counters and no modification of completed workouts.
 */
import { nextPrescription } from './progression.js'
import { rirOf } from './effort.js'
import { isWarmupRow } from './workout-model.js'

const EXPECTED = ['Push', 'Pull', 'Legs A', 'Upper', 'Lower B']
const asIds = value => Array.isArray(value) ? value : value == null ? [] : [value]

export function pplulReadiness(S) {
  if (!S || S.animeAscension?.challengeMode || S.scheduleMode === 'rotation' || S.queue) return null
  const routines = EXPECTED.map((name, index) => {
    const ids = asIds(S.week?.[index + 1])
    if (ids.length !== 1) return null
    const routine = (S.routines || []).find(r => String(r.id) === String(ids[0]))
    return routine?.name === `PPLUL · ${name}` ? routine : null
  })
  if (routines.some(r => !r)) return null

  const rows = routines.flatMap(r => (r.ex || []).map(cfg => ({ cfg, routine: r })))
  if (!rows.length) return null
  if (rows.some(({ cfg }) => cfg.prog !== 'double' || !(cfg.repsMin > 0) || !(cfg.reps > cfg.repsMin))) {
    return { upgrade: true, total: rows.length, ready: 0, building: 0, deload: 0,
      notStarted: 0, averageRir: null, ratedSets: 0 }
  }

  const prescriptions = rows.map(({ cfg, routine }) => nextPrescription(S, cfg, routine))
  const ready = prescriptions.filter(p => p.kind === 'up' && Number(p.weight) > 0).length
  const deload = prescriptions.filter(p => p.kind === 'deload').length
  const building = prescriptions.filter(p => p.kind === 'hold').length
  const notStarted = prescriptions.filter(p => p.kind === 'first').length

  const assigned = new Set(routines.map(r => String(r.id)))
  const allowedExerciseIds = new Set(rows.map(({ cfg }) => String(cfg.id)))
  const recent = (S.workouts || []).filter(w =>
    asIds(w?.routineIds ?? w?.routineId).some(id => assigned.has(String(id))) &&
    w.excludeFromProgression !== true)
    .sort((a, b) => String(a.d || '').localeCompare(String(b.d || '')) ||
      Number(a.end || 0) - Number(b.end || 0)).slice(-3)
  const ratings = recent.flatMap(w => (w.entries || []).flatMap(e =>
    e.noProg || !allowedExerciseIds.has(String(e.id)) ||
    (e.rid && !assigned.has(String(e.rid))) ? [] :
      (e.sets || []).filter(s => s.done === true && !isWarmupRow(s))
        .map(rirOf).filter(n => Number.isFinite(n) && n >= 0 && n <= 10)))
  const averageRir = ratings.length >= 5
    ? Math.round(ratings.reduce((sum, n) => sum + n, 0) / ratings.length * 10) / 10
    : null
  return { upgrade: false, total: rows.length, ready, building, deload, notStarted,
    averageRir, ratedSets: ratings.length }
}

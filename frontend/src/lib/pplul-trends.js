/** Read-only next-session details for the PPLUL Fixed Week plan. */
import { pplulReadiness } from './pplul-readiness.js'
import { nextPrescription, sessionsFor } from './progression.js'
import { EXIDX } from './exercises.js'

const ids = value => Array.isArray(value) ? value : value == null ? [] : [value]

export function pplulProgressRows(S) {
  const review = pplulReadiness(S)
  if (!review || review.upgrade) return []
  const rows = []
  for (let day = 1; day <= 5; day++) {
    const rid = ids(S.week?.[day])[0]
    const routine = (S.routines || []).find(r => String(r.id) === String(rid))
    if (!routine) continue
    for (const cfg of routine.ex || []) {
      const sessions = sessionsFor(S, cfg.id, cfg, routine.id)
      const last = sessions[sessions.length - 1]
      if (!last || !last.d) continue
      // `sessionsFor` may borrow history from another routine for the first load.
      // Explicitly label that provenance rather than claiming this plan logged it.
      const borrowed = last.rid !== routine.id
      const next = nextPrescription(S, cfg, routine)
      rows.push({ key: `${routine.id}:${cfg.id}`, day, name: EXIDX[cfg.id]?.n || cfg.id,
        date: last.d, lastReps: last.low, lastWeight: last.weight,
        borrowed, nextKind: next.kind, nextWeight: next.weight ?? last.weight,
        nextReps: next.reps ?? cfg.repsMin, unit: S.unit || 'kg' })
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.day - b.day || a.key.localeCompare(b.key))
}

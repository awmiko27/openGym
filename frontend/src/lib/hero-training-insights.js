/**
 * Hero Path Pass 3: read-only, history-derived dashboard insights.
 * Only workouts credited by the existing anime training arc are included.
 * No new counters, no XP writes, and no mutation of the workout log.
 */
import { CANON_PROGRAMS } from './anime/canon-programs.js'
import { deriveTrainingArc, localDay } from './anime/training.js'
import { bestSetOf } from './onerm.js'
import { rirOf } from './effort.js'
import { isWarmupRow } from './workout-model.js'
import { EXIDX } from './exercises.js'

const DAY = 86400000
const round1 = n => Math.round(n * 10) / 10
const dateOf = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const [year, month, day] = value.split('-').map(Number)
  const result = new Date(year, month - 1, day, 12)
  return Number.isFinite(result.getTime()) && localDay(result) === value ? result : null
}
const mondayOf = date => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  return monday
}
const addDays = (d, n) => {
  const next = new Date(d.getTime())
  next.setDate(next.getDate() + n)
  return next
}
const workSets = w => (w.entries || []).flatMap(entry =>
  (entry.sets || []).filter(s => s?.done === true && !isWarmupRow(s)))
const workoutOrder = (a, b) => String(a.d).localeCompare(String(b.d)) ||
  Number(a.end || 0) - Number(b.end || 0) || String(a.id).localeCompare(String(b.id))

/**
 * Returns null until the selected character training arc is started.
 * `now` is injectable for deterministic tests; calendar days use local dates, not UTC.
 * A calendar week's adherence is a snapshot, distinct from arc week unlock credit.
 */
export function heroTrainingInsights(S, path, now = new Date()) {
  const design = CANON_PROGRAMS[path]
  const saved = S?.animeAscension?.programs?.[path]
  const arc = design && deriveTrainingArc(S?.workouts || [], path, saved)
  if (!arc?.started) return null
  const today = localDay(now)
  const monday = mondayOf(now)
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const start = addDays(monday, (i - 3) * 7)
    return { start: localDay(start), end: localDay(addDays(start, 6)),
      label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      sessions: 0, target: design.days.length, workSets: 0,
      current: i === 3 }
  })

  const credited = new Set((arc.creditedIds || []).map(String))
  const unique = new Set()
  const workouts = (S.workouts || []).filter(w => {
    if (!w?.id || !credited.has(String(w.id)) || unique.has(String(w.id)) ||
        w.animeAscension?.challengeId || !dateOf(w.d) || w.d > today) return false
    unique.add(String(w.id))
    return true
  }).sort(workoutOrder)
  const considered = workouts.filter(w => w.d >= weeks[0].start)
  for (const workout of considered) {
    const wk = weeks.find(w => workout.d >= w.start && workout.d <= w.end)
    if (!wk) continue
    wk.sessions++
    wk.workSets += workSets(workout).length
  }

  const current = weeks[3]
  const previous = weeks[2]
  const recentSets = considered.filter(w => w.d >= weeks[2].start).flatMap(workSets)
  const rated = recentSets.map(rirOf).filter(v => Number.isFinite(v) && v >= 0 && v <= 10)
  const averageRir = rated.length >= 5 ? round1(rated.reduce((a, b) => a + b, 0) / rated.length) : null
  let recoveryNote
  if (previous.workSets >= 4 && current.workSets > previous.workSets * 1.5) {
    recoveryNote = 'Working sets in verified character sessions are over 50% higher than last calendar week. Consider how sleep, soreness and performance are responding.'
  } else if (averageRir !== null && averageRir <= 1) {
    recoveryNote = 'Recent rated sets are very close to failure. Leave room for recovery, especially if performance is declining.'
  } else if (averageRir !== null) {
    recoveryNote = 'Recent recorded effort is available. Use it alongside performance and how you feel; this is not a recovery score.'
  } else {
    recoveryNote = 'Log RIR or RPE for at least five working sets to add effort context. Recovery cannot be determined from session counts alone.'
  }

  const byLift = new Map()
  for (const workout of considered) {
    // One observation per exercise per workout, even if a routine contains it twice.
    const perWorkout = new Map()
    for (const entry of workout.entries || []) {
      if (!entry?.id) continue
      const best = bestSetOf(entry)
      if (!best || !Number.isFinite(best.est) || best.est <= 0) continue
      const key = String(entry.id)
      const existing = perWorkout.get(key)
      const unit = entry.target?.unit || workout.unit || S.unit || 'kg'
      if (!existing || best.est > existing.est) perWorkout.set(key, { est: best.est, unit })
    }
    for (const [key, point] of perWorkout) {
      if (!byLift.has(key)) byLift.set(key, [])
      byLift.get(key).push({ d: workout.d, ...point })
    }
  }
  const lifts = [...byLift].flatMap(([id, values]) => {
    if (values.length < 2) return []
    const a = values[values.length - 2]
    const b = values[values.length - 1]
    // Different recorded load units cannot be compared as raw numbers.
    if (a.unit !== b.unit) return []
    const name = EXIDX[id]?.n || (S.customEx || []).find(e => String(e.id) === id)?.n || id
    return [{ id, name, previous: a.est, current: b.est, unit: b.unit,
      changePct: round1((b.est - a.est) / a.est * 100), sessions: values.length, date: b.d }]
  }).sort((a, b) => b.date.localeCompare(a.date) || b.sessions - a.sessions || a.id.localeCompare(b.id)).slice(0, 3)

  return {
    path, unit: S.unit || 'kg', target: design.days.length, weeks,
    thisWeek: current.sessions, previousWeek: previous.sessions,
    lastFourWeeks: weeks.reduce((n, w) => n + w.sessions, 0),
    currentWorkSets: current.workSets, previousWorkSets: previous.workSets,
    averageRir, ratedSets: rated.length, recoveryNote, lifts,
    hasWorkouts: considered.length > 0,
  }
}

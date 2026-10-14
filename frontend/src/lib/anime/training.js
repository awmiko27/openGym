// Phase 5A — opt-in, history-derived training phases. No parallel workout log.
import { isQualifiedAnimeWorkout } from './rpg.js'
import { CANON_PROGRAMS, characterSessionCount } from './canon-programs.js'

export const TRAINING_ARCS = Object.freeze({
  saitama: { weeks: 9, phases: CANON_PROGRAMS.saitama.phaseLabels, split: [3, 3, 3] },
  goku: { weeks: 10, phases: CANON_PROGRAMS.goku.phaseLabels, split: [5, 5] },
  jinwoo: { weeks: 9, phases: CANON_PROGRAMS.jinwoo.phaseLabels, split: [3, 3, 3] },
})

export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const startTrainingArc = (at = Date.now()) => ({ v: 1, startedAt: at, loadedWeek: 0 })

// openGym saves a local ISO workout date and completion timestamp. We validate
// dates before comparing them; different split sessions may be on adjacent days.
const dayNumber = day => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return null
  const ms = Date.parse(`${day}T12:00:00Z`)
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === day
    ? Math.floor(ms / 86400000) : null
}

export function qualifyingAfter(workouts, path, startedAt) {
  if (!Number.isFinite(startedAt) || startedAt <= 0) return []
  const seen = new Set()
  return (Array.isArray(workouts) ? workouts : []).filter(w => {
    const end = Number(w?.end)
    const day = dayNumber(w?.d)
    if (!isQualifiedAnimeWorkout(w) || w.animeAscension.path !== path || day === null ||
        !Number.isFinite(end) || end < startedAt || seen.has(String(w.id))) return false
    seen.add(String(w.id))
    return true
  }).sort((a, b) => Number(a.end) - Number(b.end) || String(a.id).localeCompare(String(b.id)))
}

export function deriveTrainingArc(workouts, path, program) {
  const design = TRAINING_ARCS[path]
  if (!design) return null
  const required = characterSessionCount(path)
  if (program?.v !== 1 || !Number.isFinite(program.startedAt))
    return { path, started: false, week: 1, loadedWeek: 0, phase: design.phases[0], completed: false, done: 0, required, totalWeeks: design.weeks }
  const eligible = qualifyingAfter(workouts, path, program.startedAt)
  const credited = []
  let weekSlots = new Set()
  let weekFirstDay = null
  const usedDays = new Set()
  let weekDone = 0
  for (const workout of eligible) {
    const day = dayNumber(workout.d)
    const slot = workout.animeAscension?.slot
    // The character's split may put different muscle groups on adjacent days.
    // Require separate dates and all distinct prescribed slots, not 48h between
    // every session (which made a 5-day training week mathematically impossible).
    const expectedWeek = Math.floor(credited.length / required) + 1
    // A new phase cannot be credited by repeating an older week's easier
    // prescription: the user has to load the newly unlocked native plan.
    if (workout.animeAscension?.trainingWeek !== expectedWeek ||
        usedDays.has(workout.d) ||
        !CANON_PROGRAMS[path].days.some(d => d.slot === slot) || weekSlots.has(slot) ||
        // For 5-day weeks, ensure at least one unscheduled recovery date.
        (required === 5 && weekSlots.size === 4 && weekFirstDay !== null && day - weekFirstDay < 5)) continue
    credited.push(workout)
    usedDays.add(workout.d)
    if (weekFirstDay === null) weekFirstDay = day
    weekSlots.add(slot)
    if (++weekDone === required) { weekDone = 0; weekSlots = new Set(); weekFirstDay = null }
    if (credited.length === design.weeks * required) break
  }
  const completedWeeks = Math.floor(credited.length / required)
  const completed = completedWeeks >= design.weeks
  const week = Math.min(design.weeks, completedWeeks + 1)
  const startWeek = design.split.reduce((acc, length, index) =>
    acc.found ? acc : week <= acc.offset + length
      ? { found: true, offset: acc.offset, phaseIndex: index }
      : { found: false, offset: acc.offset + length, phaseIndex: index },
  { found: false, offset: 0, phaseIndex: 0 })
  return {
    path, started: true, startedAt: program.startedAt, week, loadedWeek: Number(program.loadedWeek) || 0,
    phase: design.phases[startWeek.phaseIndex], phaseIndex: startWeek.phaseIndex,
    weekInPhase: week - startWeek.offset, completed, done: weekDone, required,
    creditedIds: credited.map(w => String(w.id)), completedWeeks, totalWeeks: design.weeks,
    // Avoid silently replacing a schedule while the user is in an active workout.
    needsLoad: !completed && week !== Number(program.loadedWeek),
  }
}

/** Original gradual overload, deliberately capped. No automatic load/weight changes. */
export function trainingPrescriptionDelta(path, rawWeek) {
  const design = TRAINING_ARCS[path]
  const week = Number(rawWeek)
  if (!design || !Number.isInteger(week) || week < 1 || week > design.weeks) return { sets: 0, reps: 0 }
  let offset = 0
  let index = 0
  while (index < design.split.length - 1 && week > offset + design.split[index]) {
    offset += design.split[index]
    index++
  }
  const within = week - offset
  // Increase only a little within phases; the first week of a new phase is
  // deliberately easier than the preceding phase's peak week.
  return { sets: index >= 1 && within >= 2 ? 1 : 0, reps: index + Math.floor((within - 1) / 2) }
}

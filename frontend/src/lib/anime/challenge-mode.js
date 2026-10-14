/** Major challenges temporarily own the Fixed Week calendar. Only openGym saves
 * workouts; the mode holds a reversible schedule receipt and NO reward balance.
 */
import { buildSaitamaFoundation } from './saitama.js'
import { buildCharacterFoundation } from './character-paths.js'
import { CHALLENGES, challengeTierStates, deriveChallenge, enrollChallenge } from './challenges.js'

const weekCopy = week => Object.fromEntries(Object.entries(week || {}).map(([k, v]) =>
  [k, Array.isArray(v) ? [...v] : v]))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const dayValue = (week, day) => Object.prototype.hasOwnProperty.call(week || {}, day)
  ? week[day] : undefined

export function challengePlan(state, id, { catalogue, equipment, isAvailable, uid, now = Date.now() }) {
  const definition = CHALLENGES[id]
  if (!definition || state?.active || state?.animeAscension?.challengeMode ||
      !Array.isArray(state?.routines) || !state?.week || typeof uid !== 'function') return null
  const path = definition.path
  const history = state.animeAscension?.challenges?.[path] || []
  if (!challengeTierStates(state.workouts, path, history).find(t => t.id === id)?.canStart) return null
  const profile = { ...(state.animeAscension || {}), trainingWeek: Number(state.animeAscension?.programs?.[path]?.loadedWeek) || 1 }
  const options = { catalogue, equipment, isAvailable, uid, profile }
  const base = path === 'saitama' ? buildSaitamaFoundation(options) : buildCharacterFoundation(path, options)
  if (!base || !Array.isArray(base.routines) || !Array.isArray(base.schedule)) return null
  // The 7-day trial samples three of the character's distinct training themes.
  // Tier II uses four sessions; Tier III uses the full character split.
  const count = definition.days === 7 ? 3 : definition.days === 14 ? 4 : base.routines.length
  const indices = definition.days === 7 ? [0, Math.max(1, base.routines.length - 2), base.routines.length - 1]
    : Array.from({ length: count }, (_, i) => i)
  const selected = [...new Set(indices)]
  if (selected.length !== count || selected.some(i => !base.routines[i] || !base.schedule[i])) return null
  const bump = definition.days === 30 ? 2 : definition.days === 14 ? 1 : 0
  const routines = selected.map((i, index) => ({ ...base.routines[i],
    name: `${base.routines[i].name} · Trial ${id}`,
    // Trial prescriptions have their own conservative buildup; final-session
    // volume rises slightly for the longer, unlocked challenge tiers.
    ex: base.routines[i].ex.map(row => ({ ...row,
      sets: Math.min(4, Number(row.sets) + (index === selected.length - 1 && definition.days > 7 ? 1 : 0)),
      reps: Math.min(20, Number(row.reps) + bump + (index > 0 ? 1 : 0)),
    })),
  }))
  if (routines.some(r => !r.ex?.length)) return null
  // The first workout is on the day the challenge actually starts. Preserve
  // the program's relative rest spacing as we rotate it around that day.
  // Example: a Wednesday start means Wednesday is Day 1, not a rest day.
  if (!Number.isFinite(now)) return null
  const startedAt = now
  const startDay = new Date(startedAt).getDay() // openGym's weekday indices, local time
  const originalFirstDay = base.schedule[selected[0]].day
  const schedule = selected.map((i, j) => ({
    day: (startDay + (base.schedule[i].day - originalFirstDay + 7) % 7) % 7,
    routineId: routines[j].id,
  }))
  if (new Set(schedule.map(s => s.day)).size !== schedule.length) return null
  const challengeWeek = Object.fromEntries(schedule.map(s => [s.day, [s.routineId]]))
  return { id, path, startedAt, startDay, routines, schedule,
    before: weekCopy(state.week), challengeWeek,
    previousPath: state.animeAscension?.path || path }
}

/** A transactional store mutation: caller passes a prepared plan only after
 * validating active-session and Fixed Week guards immediately before update.
 * Throws before writing if the schedule changed since the preview was created.
 */
export function activateChallenge(state, plan) {
  if (state.active || state.animeAscension?.challengeMode || !plan?.id || !CHALLENGES[plan.id] ||
      !same(weekCopy(state.week), plan.before)) throw new Error('Workout or weekly plan changed; review the challenge again.')
  const aa = state.animeAscension || {}
  const histories = aa.challenges || {}
  const history = Array.isArray(histories[plan.path]) ? histories[plan.path] : []
  const next = enrollChallenge(state.workouts, plan.path, history, plan.id, plan.startedAt)
  if (next === history) throw new Error('Challenge is no longer available.')
  const entry = { ...next.at(-1), v: 2 } // v2 requires challenge-specific saved-workout proof.
  state.routines.push(...plan.routines)
  state.week = weekCopy(plan.challengeWeek)
  state.animeAscension = {
    ...aa, path: plan.path,
    challenges: { ...histories, [plan.path]: [...history, entry] },
    challengeMode: { v: 1, id: plan.id, path: plan.path, startedAt: plan.startedAt,
      previousPath: plan.previousPath, before: weekCopy(plan.before), startDay: plan.startDay,
      installed: weekCopy(plan.challengeWeek), routineIds: plan.routines.map(r => r.id) },
  }
}

export function activeChallengeProgress(state) {
  const mode = state?.animeAscension?.challengeMode
  if (mode?.v !== 1) return null
  const history = state.animeAscension?.challenges?.[mode.path] || []
  const entry = history.findLast(x => x.id === mode.id && x.startedAt === mode.startedAt && x.v === 2)
  return entry ? deriveChallenge(state.workouts, entry) : null
}

/** Restore the saved calendar and delete only temporary challenge routines.
 * openGym's completed workout records contain their own name and exercise rows,
 * so removing a template does not delete previously logged history.
 * Manual calendar edits are retained, minus references to removed trial routines.
 */
export function exitChallenge(state, { cancel = false, at = Date.now() } = {}) {
  const mode = state.animeAscension?.challengeMode
  if (!mode || state.active) throw new Error('Finish or discard your current workout first.')
  const progress = activeChallengeProgress(state)
  if (!cancel && !progress?.finished) throw new Error('Finish the challenge or choose Cancel.')
  const week = weekCopy(state.week)
  const preservedDays = []
  for (let day = 0; day < 7; day++) {
    if (!same(dayValue(week, day), dayValue(mode.installed, day))) {
      preservedDays.push(day)
      continue
    }
    if (dayValue(mode.before, day) === undefined) delete week[day]
    else week[day] = Array.isArray(mode.before[day]) ? [...mode.before[day]] : mode.before[day]
  }
  // Some manually edited weekdays may still refer to a trial routine. Remove
  // those references as well so the calendar never points at a deleted template.
  const owned = new Set(Array.isArray(mode.routineIds) ? mode.routineIds.map(String) : [])
  for (let day = 0; day < 7; day++) {
    const assigned = dayValue(week, day)
    if (Array.isArray(assigned)) {
      const kept = assigned.filter(id => !owned.has(String(id)))
      if (kept.length !== assigned.length) {
        if (kept.length) week[day] = kept
        else if (dayValue(mode.before, day) !== undefined) week[day] = dayValue(mode.before, day)
        else delete week[day]
      }
    } else if (owned.has(String(assigned))) {
      if (dayValue(mode.before, day) !== undefined) week[day] = dayValue(mode.before, day)
      else delete week[day]
    }
  }
  // A completed workout has a snapshot in S.workouts: never remove its history.
  // Only remove the generated templates with IDs recorded in this mode receipt.
  state.routines = (state.routines || []).filter(r => !owned.has(String(r?.id)))
  const aa = state.animeAscension
  let challenges = aa.challenges || {}
  if (cancel && progress && !progress.finished) {
    challenges = { ...challenges, [mode.path]: (challenges[mode.path] || []).map(entry =>
      entry.id === mode.id && entry.startedAt === mode.startedAt && entry.v === 2
        ? { ...entry, cancelledAt: at } : entry) }
  }
  state.week = week
  state.animeAscension = { ...aa, path: mode.previousPath, challengeMode: null, challenges,
    lastChallengeRestore: { id: mode.id, cancelled: cancel && !progress?.finished, preservedDays, at } }
  return { preservedDays, completed: Boolean(progress?.finished) }
}

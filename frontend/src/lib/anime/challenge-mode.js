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
  // Character- and tier-specific assessment movements. These are genuine
  // movement choices from the loaded openGym program, never invented IDs.
  const leadByPath = { saitama: [0, 1, 4], goku: [0, 1, 2], jinwoo: [0, 2, 4] }
  const tier = definition.days === 7 ? 0 : definition.days === 14 ? 1 : 2
  const firstIndex = leadByPath[path]?.[tier]
  const count = definition.days === 7 ? 3 : definition.days === 14 ? 4 : base.routines.length
  if (!Number.isInteger(firstIndex) || !base.routines[firstIndex] || count > base.routines.length) return null
  const selected = Array.from({ length: count }, (_, i) => (firstIndex + i) % base.routines.length)
  if (selected.some(i => !base.routines[i] || !base.schedule[i])) return null
  const bump = tier === 2 ? 2 : tier === 1 ? 1 : 0
  const routines = selected.map((i, index) => ({ ...base.routines[i],
    name: `${base.routines[i].name} · Trial ${id}`,
    ex: base.routines[i].ex.map(row => ({ ...row,
      sets: Math.min(4, Number(row.sets) + (index === selected.length - 1 && tier > 0 ? 1 : 0)),
      reps: Math.min(20, Number(row.reps) + bump + (index > 0 ? 1 : 0)),
    })),
  }))
  if (routines.some(r => !r.ex?.length)) return null

  // An assessment is performed at the beginning and the final session. For
  // 14/30-day blocks there is also an intermediate checkpoint. The final
  // routine contains the *same actual exercise ID* as the baseline, with a
  // conservatively increased repetition target. Every set is still verified
  // by the existing openGym workout-proof engine.
  const baselineRow = routines[0].ex[0]
  if (!baselineRow || !Number.isFinite(baselineRow.sets) || !Number.isFinite(baselineRow.reps)) return null
  const baselineTotal = baselineRow.sets * baselineRow.reps
  const minGain = Math.max(2, Math.ceil(baselineTotal * [0.08, 0.10, 0.12][tier]))
  const checkpointIndex = tier === 0 ? null : tier === 1 ? 3 : path === 'goku' ? 6 : 7
  const lastIndex = definition.sessions - 1
  const finalTemplate = lastIndex % routines.length
  const checkpointTemplate = checkpointIndex === null ? null : checkpointIndex % routines.length
  if (checkpointTemplate === finalTemplate || checkpointTemplate === 0 || finalTemplate === 0) return null
  const addAssessment = (routineIndex, gain) => {
    const routine = routines[routineIndex]
    const requiredTotal = baselineTotal + gain
    const targetReps = Math.ceil(requiredTotal / baselineRow.sets)
    if (targetReps > 24) return null // safety ceiling; fail before editing user's plan
    const row = { ...baselineRow, sets: baselineRow.sets, reps: targetReps }
    const original = routine.ex.findIndex(ex => String(ex.id) === String(baselineRow.id))
    routine.ex = [...routine.ex]
    if (original >= 0) routine.ex[original] = row
    else routine.ex.push(row)
    return row.sets * row.reps
  }
  const checkpointTotal = checkpointTemplate === null ? null
    : addAssessment(checkpointTemplate, Math.max(1, Math.ceil(minGain / 2)))
  const finalTotal = addAssessment(finalTemplate, minGain)
  if (finalTotal === null || (checkpointTemplate !== null && checkpointTotal === null)) return null
  const actualExercise = catalogue.find(ex => String(ex?.id) === String(baselineRow.id))
  const objective = {
    v: 1, title: definition.name, focus: definition.focus,
    anchorId: baselineRow.id, exerciseName: actualExercise?.n || 'Assessment movement',
    baselineTotal, minGain, finalTotal,
    checkpointAt: checkpointIndex === null ? null : checkpointIndex + 1,
    checkpointTotal,
  }
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
  return { id, path, startedAt, startDay, routines, schedule, objective,
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
  if (!plan.objective || !Array.isArray(plan.routines) || plan.routines.length < 3)
    throw new Error('Missing trial assessment. Review the challenge again.')
  const entry = { ...next.at(-1), v: 3,
    objective: structuredClone(plan.objective),
    routineIds: plan.routines.map(r => r.id),
  } // v3 adds measured baseline, checkpoint, and final assessment proof.
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
  const entry = history.findLast(x => x.id === mode.id && x.startedAt === mode.startedAt && [2, 3].includes(x.v))
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
      entry.id === mode.id && entry.startedAt === mode.startedAt && [2, 3].includes(entry.v)
        ? { ...entry, cancelledAt: at } : entry) }
  }
  state.week = week
  state.animeAscension = { ...aa, path: mode.previousPath, challengeMode: null, challenges,
    lastChallengeRestore: { id: mode.id, cancelled: cancel && !progress?.finished, preservedDays, at } }
  return { preservedDays, completed: Boolean(progress?.finished) }
}

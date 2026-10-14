// Phase 5B MVP — history-derived benchmark trials; only openGym logs workouts.
import { qualifyingAfter, localDay } from './training.js'
import { characterSessionCount } from './canon-programs.js'

// Original, canon-inspired trial objectives. The named benchmark movement is
// selected from openGym's eligible catalogue at enrollment and frozen in the
// attempt receipt. No published third-party training prescriptions are copied.
const MISSIONS = {
  saitama: [
    { name: 'Hero Entrance Examination', focus: 'Push-up capacity', mission: 'Establish a controlled push-up baseline, prepare your calisthenics, and beat the baseline in a final Hero Trial.' },
    { name: 'Hero Endurance Circuit', focus: 'Squat work capacity', mission: 'Build repeatable lower-body endurance, pass a midway checkpoint, then improve your squat benchmark.' },
    { name: 'One-Punch Hero Assessment', focus: 'Full-body endurance', mission: 'Complete a longer hero training block, increase your endurance benchmark, and finish the final Hero Examination.' },
  ],
  goku: [
    { name: 'Turtle School Entrance Test', focus: 'Turtle School leg endurance', mission: 'Establish your basic conditioning benchmark and show measurable improvement at the final Turtle School assessment.' },
    { name: 'Saiyan Strength Trials', focus: 'Upper-body work capacity', mission: 'Progress through strength sessions, clear a checkpoint, and finish with greater controlled training volume.' },
    { name: 'Gravity Chamber Assessment', focus: 'Leg training volume', mission: 'Build a longer resistance-training block and overcome a progressively harder gravity-inspired finale.' },
  ],
  jinwoo: [
    { name: 'System Awakening Trial', focus: 'Daily Quest push-ups', mission: 'Record the opening System quest benchmark, complete preparation missions, and improve your final result.' },
    { name: 'Dungeon Survival Trial', focus: 'Hunter movement capacity', mission: 'Train hunter movement, pass a mid-dungeon checkpoint, and complete an improved final encounter.' },
    { name: 'Hunter Promotion Raid', focus: 'System endurance', mission: 'Survive a longer series of verified quests and pass the final Hunter Promotion assessment.' },
  ],
}
const LENGTHS = [7, 14, 30]
const TARGETS = [3, 6, 12]
const BONUSES = [60, 150, 350]
export const CHALLENGES = Object.freeze(Object.fromEntries(Object.entries(MISSIONS).flatMap(([path, names]) =>
  names.map((mission, i) => {
    const id = `${path}-${LENGTHS[i]}`
    return [id, { id, path, ...mission, days: LENGTHS[i], sessions: TARGETS[i], bonusXp: BONUSES[i],
      description: `${mission.mission} Requires ${TARGETS[i]} qualifying sessions, distinct training dates, and an improved final assessment.` }]
  }))))

export const beginChallenge = (id, at = Date.now()) => {
  if (!CHALLENGES[id]) throw new Error('Unknown challenge')
  return { v: 1, id, startedAt: at }
}

/** Count completed exercise repetitions only from a verified native workout.
 * This is an achievement metric, not a substitute for the XP proof checker.
 */
export function exerciseReps(workout, exerciseId) {
  if (!exerciseId) return null
  const matches = (Array.isArray(workout?.entries) ? workout.entries : [])
    .filter(row => String(row?.id) === String(exerciseId))
  if (matches.length !== 1 || !Array.isArray(matches[0].sets) || !matches[0].sets.length) return null
  let score = 0
  for (const set of matches[0].sets) {
    const reps = Number(set?.r)
    if (set?.done !== true || !Number.isFinite(reps) || reps <= 0) return null
    score += reps
  }
  return score
}

export function deriveChallenge(workouts, active, today = localDay()) {
  const design = CHALLENGES[active?.id]
  if (!design || ![1, 2, 3].includes(active?.v) || !Number.isFinite(active.startedAt)) return null
  const strict = active.v >= 2
  const assessment = active.v === 3 ? active.objective : null
  const routineIds = active.v === 3 ? active.routineIds : null
  if (active.v === 3 && (!assessment || assessment.v !== 1 ||
      !assessment.anchorId || !Array.isArray(routineIds) || routineIds.length < 3 ||
      !routineIds.every(Boolean) || !Number.isFinite(assessment.finalTotal))) return null

  const eligible = qualifyingAfter(workouts, design.path, active.startedAt)
    .filter(w => !strict || w.animeAscension?.challengeId === active.id)
  const usedDays = new Set(), credited = [], slotsInCycle = new Set()
  const distinct = design.days === 7 ? 3 : design.days === 14 ? 4 : characterSessionCount(design.path)
  let baseline = null, checkpointScore = null, finalScore = null
  for (const w of eligible) {
    if (usedDays.has(w.d)) continue
    if (active.v === 3) {
      const expected = routineIds[credited.length % routineIds.length]
      if (String(w.animeAscension?.routineId) !== String(expected)) continue
      const slotScore = exerciseReps(w, assessment.anchorId)
      if (credited.length === 0) {
        if (slotScore === null) continue
        baseline = slotScore
      }
      if (credited.length + 1 === assessment.checkpointAt) {
        if (slotScore === null || slotScore < Math.max(assessment.checkpointTotal, baseline + 1)) continue
        checkpointScore = slotScore
      }
      if (credited.length + 1 === design.sessions) {
        if (slotScore === null || slotScore < Math.max(assessment.finalTotal, baseline + assessment.minGain)) continue
        finalScore = slotScore
      }
    } else if (strict) {
      // Retain v2 behavior for challenge attempts started before this revision.
      const slot = w.animeAscension?.slot
      if (!slot || slotsInCycle.has(slot)) continue
      slotsInCycle.add(slot)
      if (slotsInCycle.size === distinct) slotsInCycle.clear()
    }
    usedDays.add(w.d)
    credited.push(w)
    if (credited.length === design.sessions) break
  }
  const cancelled = Number.isFinite(active.cancelledAt)
  const count = credited.length
  const finished = !cancelled && count >= design.sessions
  const startedDay = localDay(new Date(active.startedAt))
  const elapsed = Math.max(1, Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${startedDay}T12:00:00Z`)) / 86400000) + 1)
  const objective = assessment ? {
    title: assessment.title, focus: assessment.focus, exerciseName: assessment.exerciseName,
    baseline, plannedBaseline: assessment.baselineTotal,
    checkpointAt: assessment.checkpointAt, checkpointScore,
    checkpointTarget: baseline === null ? assessment.checkpointTotal : Math.max(assessment.checkpointTotal, baseline + 1),
    finalScore, finalTarget: baseline === null ? assessment.finalTotal : Math.max(assessment.finalTotal, baseline + assessment.minGain),
  } : null
  return { ...design, count, finished, cancelled, bonusXp: finished ? design.bonusXp : 0,
    potentialXp: design.bonusXp, elapsed, extended: elapsed > design.days && !finished && !cancelled,
    finalTrial: count === design.sessions - 1 && !finished && !cancelled,
    objective, ids: credited.map(w => String(w.id)), completedOn: finished ? credited.at(-1).d : null }
}

/** Latest attempt for a tier wins unless an earlier attempt was completed.
 * A cancelled attempt can be restarted; earned XP for a tier is counted once.
 */
export function challengeProgresses(workouts, statesForPath) {
  const list = Array.isArray(statesForPath) ? statesForPath : []
  const byId = new Map()
  for (const state of list) {
    const result = deriveChallenge(workouts, state)
    if (!result) continue
    const earlier = byId.get(result.id)
    if (!earlier?.finished) byId.set(result.id, result)
  }
  return [...byId.values()]
}

/** Ordered challenge ladder for a single character: 7 → 14 → 30 days.
 * Tiers unlock from VERIFIED completion of the preceding tier, not elapsed time.
 * Existing started tiers (including older out-of-order saves) remain visible
 * and retain derived rewards; this only restricts future enrollments.
 */
export function challengeTierStates(workouts, path, history) {
  const progress = challengeProgresses(workouts, history).filter(c => c.path === path)
  const current = new Map(progress.map(c => [c.id, c]))
  const active = progress.some(c => !c.finished && !c.cancelled)
  const lengths = [7, 14, 30]
  return lengths.map((days, i) => {
    const definition = CHALLENGES[`${path}-${days}`]
    if (!definition) return null
    const unlocked = i === 0 || lengths.slice(0, i).every(length => current.get(`${path}-${length}`)?.finished === true)
    const saved = current.get(definition.id) || null
    return {
      ...definition, tier: i + 1, progress: saved, unlocked,
      canStart: unlocked && (!saved || saved.cancelled) && !active,
      status: saved && !saved.cancelled ? (saved.finished ? 'completed' : 'in-progress') : unlocked ? 'available' : 'locked',
      prerequisite: i ? CHALLENGES[`${path}-${lengths[i - 1]}`]?.name : null,
    }
  }).filter(Boolean)
}

/** Pure enrollment gate. Also used INSIDE the store update to avoid stale UI. */
export function enrollChallenge(workouts, path, history, id, now = Date.now()) {
  const previous = Array.isArray(history) ? history : []
  const tier = challengeTierStates(workouts, path, previous).find(t => t.id === id)
  if (!tier?.canStart || !Number.isFinite(now)) return previous
  return [...previous, beginChallenge(id, now)]
}

export function challengeBonuses(workouts, states) {
  const result = {}
  for (const [path, history] of Object.entries(states || {})) {
    result[path] = challengeProgresses(workouts, history)
      .filter(progress => progress.path === path)
      .reduce((xp, progress) => xp + progress.bonusXp, 0)
  }
  return result
}

export function xpLevel(xp) {
  let level = 1, remaining = Math.max(0, xp)
  while (remaining >= 100 + 25 * (level - 1)) {
    remaining -= 100 + 25 * (level - 1)
    level++
  }
  return { level, levelXp: remaining, nextLevelXp: 100 + 25 * (level - 1) }
}

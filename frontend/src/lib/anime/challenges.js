// Phase 5B — optional bounded objectives; training sessions remain logged only by openGym.
import { qualifyingAfter, localDay } from './training.js'

const NAMES = {
  saitama: ['Hero First Steps', 'Hero Consistency', 'Hero Trial'],
  goku: ['Earth Training Trial', 'Saiyan Discipline', 'Gravity Apprentice'],
  jinwoo: ['Hunter Initiation', 'Dungeon Expedition', 'Hunter Promotion'],
}
const LENGTHS = [7, 14, 30]
const TARGETS = [3, 6, 12]
const BONUSES = [60, 150, 350]
export const CHALLENGES = Object.freeze(Object.fromEntries(Object.entries(NAMES).flatMap(([path, names]) =>
  names.map((name, i) => {
    const id = `${path}-${LENGTHS[i]}`
    return [id, { id, path, name, days: LENGTHS[i], sessions: TARGETS[i], bonusXp: BONUSES[i],
      description: `Complete ${TARGETS[i]} verified workouts on distinct days, using the character's scheduled recovery days. The final session is your trial.` }]
  }))))

export const beginChallenge = (id, at = Date.now()) => {
  if (!CHALLENGES[id]) throw new Error('Unknown challenge')
  return { v: 1, id, startedAt: at }
}

export function deriveChallenge(workouts, active, today = localDay()) {
  const design = CHALLENGES[active?.id]
  if (!design || active?.v !== 1 || !Number.isFinite(active.startedAt)) return null
  const eligible = qualifyingAfter(workouts, design.path, active.startedAt)
  const usedDays = new Set(), credited = []
  for (const w of eligible) {
    const day = Math.floor(Date.parse(`${w.d}T12:00:00Z`) / 86400000)
    if (!Number.isFinite(day) || usedDays.has(w.d)) continue
    usedDays.add(w.d)
    credited.push(w)
    if (credited.length === design.sessions) break
  }
  const count = credited.length
  const finished = count >= design.sessions
  const startedDay = localDay(new Date(active.startedAt))
  const elapsed = Math.max(1, Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${startedDay}T12:00:00Z`)) / 86400000) + 1)
  return { ...design, count, finished, bonusXp: finished ? design.bonusXp : 0,
    potentialXp: design.bonusXp, elapsed, extended: elapsed > design.days && !finished,
    finalTrial: count === design.sessions - 1 && !finished,
    ids: credited.map(w => String(w.id)), completedOn: finished ? credited.at(-1).d : null }
}

// Reward balance remains a pure projection of the saved workout history and
// opted-in challenge; neither viewing nor repeating a screen can mint rewards.
export function challengeProgresses(workouts, statesForPath) {
  const list = Array.isArray(statesForPath) ? statesForPath : []
  const seen = new Set()
  return list.map(state => {
    if (!state?.id || seen.has(state.id)) return null
    seen.add(state.id)
    return deriveChallenge(workouts, state)
  }).filter(Boolean)
}

/** Ordered challenge ladder for a single character: 7 → 14 → 30 days.
 * Tiers unlock from VERIFIED completion of the preceding tier, not elapsed time.
 * Existing started tiers (including older out-of-order saves) remain visible
 * and retain derived rewards; this only restricts future enrollments.
 */
export function challengeTierStates(workouts, path, history) {
  const progress = challengeProgresses(workouts, history).filter(c => c.path === path)
  const current = new Map(progress.map(c => [c.id, c]))
  const active = progress.some(c => !c.finished)
  const lengths = [7, 14, 30]
  return lengths.map((days, i) => {
    const definition = CHALLENGES[`${path}-${days}`]
    if (!definition) return null
    const unlocked = i === 0 || lengths.slice(0, i).every(length => current.get(`${path}-${length}`)?.finished === true)
    const saved = current.get(definition.id) || null
    return {
      ...definition, tier: i + 1, progress: saved, unlocked,
      canStart: unlocked && !saved && !active,
      status: saved ? (saved.finished ? 'completed' : 'in-progress') : unlocked ? 'available' : 'locked',
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

// Phase 5B — optional bounded objectives; training sessions remain logged only by openGym.
import { qualifyingAfter, localDay } from './training.js'
import { characterSessionCount } from './canon-programs.js'

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
  if (!design || ![1, 2].includes(active?.v) || !Number.isFinite(active.startedAt)) return null
  const strict = active.v === 2
  const eligible = qualifyingAfter(workouts, design.path, active.startedAt)
    .filter(w => !strict || w.animeAscension?.challengeId === active.id)
  const usedDays = new Set(), credited = [], slotsInCycle = new Set()
  const distinct = design.days === 7 ? 3 : design.days === 14 ? 4 : characterSessionCount(design.path)
  for (const w of eligible) {
    if (usedDays.has(w.d)) continue
    // In a new major challenge, each prescribed session type must be
    // performed before repeating that type for additional credit.
    if (strict) {
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
  return { ...design, count, finished, cancelled, bonusXp: finished ? design.bonusXp : 0,
    potentialXp: design.bonusXp, elapsed, extended: elapsed > design.days && !finished && !cancelled,
    finalTrial: count === design.sessions - 1 && !finished && !cancelled,
    ids: credited.map(w => String(w.id)), completedOn: finished ? credited.at(-1).d : null }
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

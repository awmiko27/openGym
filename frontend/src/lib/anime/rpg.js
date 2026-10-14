// Anime Ascension Phase 3 — pure, derived RPG progression over openGym history.
// AGPL-3.0-or-later. No background rewards, extra database or mutable XP balance.
// Workout edits/deletions deterministically recalculate awards; a workout ID counts once.

export const PATH = 'saitama'
export const ANIME_RPG_PATHS = Object.freeze({
  saitama: { title: 'Saitama · Hero Training', quest: 'Hero', ranks: ['Hero Candidate', 'C-Class Hero', 'B-Class Candidate'], arcs: ['Hero Candidate', 'C-Class Training'] },
  goku: { title: 'Goku · Saiyan Training', quest: 'Saiyan', ranks: ['Saiyan Trainee', 'Z Fighter', 'Saiyan Elite'], arcs: ['Earth Training', 'Gravity Training'] },
  jinwoo: { title: 'Sung Jinwoo · Hunter Training', quest: 'Hunter', ranks: ['E-Rank Hunter', 'D-Rank Hunter', 'C-Rank Hunter'], arcs: ['Hunter Initiation', 'Dungeon Training'] },
})
const PATH_ROUTINES = {
  saitama: /^Saitama · Hero Foundation [ABC](?: — (?:Strength|Endurance|Conditioning))?$/,
  goku: /^Goku · Saiyan Foundation [ABC] — (?:Strength|Power|Conditioning)$/,
  jinwoo: /^Sung Jinwoo · Hunter Foundation [ABC] — (?:Strength|Agility|Endurance)$/,
}
const isAnimePath = path => Object.hasOwn(PATH_ROUTINES, path)

const safeArray = x => Array.isArray(x) ? x : []
const safePositive = x => Number.isFinite(Number(x)) && Number(x) > 0
const isReps = x => Number.isFinite(Number(x?.r)) && Number(x.r) > 0

/**
 * Snapshot when a native openGym session starts. A freestyle, historical backfill,
 * mixed-routine session, or unrelated routine does not become an RPG quest.
 * Includes all prescribed working sets. Phase 3 only supports rep-based sets.
 */
export function animeSessionSnapshot(state, routineIds, entries) {
  const ids = safeArray(routineIds)
  const path = state?.animeAscension?.path
  if (!isAnimePath(path) || ids.length !== 1) return null
  const routine = safeArray(state?.routines).find(r => r?.id === ids[0])
  if (!routine || !PATH_ROUTINES[path].test(routine.name || '')) return null
  const es = safeArray(entries)
  if (!es.length || es.some(e => !e?.id || !safeArray(e.sets).length ||
    e.noProg === true || e.sets.some(s => !isReps(s) || s?.warmup === true || s?.sides))) return null
  return {
    v: 1, path, routineId: ids[0],
    // Source prescription, not rewritten by subsequent exercise swaps or plan edits.
    requirements: es.map(e => ({ id: e.id, reps: e.sets.map(s => Number(s.r)) })),
  }
}

/** Avoid adding a new field to openGym's default non-anime active-workout shape. */
export function animeActiveFields(state, routineIds, entries) {
  const snapshot = animeSessionSnapshot(state, routineIds, entries)
  return snapshot ? { animeAscension: snapshot } : {}
}

// Pure projection attached only at openGym's normal finish boundary.
export function animeSessionProof(active) {
  const snap = active?.animeAscension
  if (snap?.v !== 1 || !isAnimePath(snap.path) || !Array.isArray(snap.requirements)) return null
  return { v: 1, path: snap.path, routineId: snap.routineId, requirements: snap.requirements }
}

export function isQualifiedAnimeWorkout(workout) {
  const snap = workout?.animeAscension
  if (snap?.v !== 1 || !isAnimePath(snap.path) || !snap.routineId ||
      !Array.isArray(snap.requirements) || !snap.requirements.length) return false
  if (!workout?.id || !workout?.end || workout.excludeFromProgression === true) return false
  const rids = safeArray(workout.routineIds || (workout.routineId ? [workout.routineId] : []))
  if (rids.length !== 1 || String(rids[0]) !== String(snap.routineId)) return false
  const entries = safeArray(workout.entries)
  // Entries that vanished on an early finish must fail. Swaps and unexpected extras
  // require review, not automatic anime XP.
  if (entries.length !== snap.requirements.length) return false
  return snap.requirements.every((req, i) => {
    const actual = entries[i]
    const sets = safeArray(actual?.sets)
    if (actual?.id !== req.id || actual?.noProg === true ||
        sets.length !== safeArray(req.reps).length || !sets.length) return false
    return req.reps.every((target, n) => safePositive(target) &&
      sets[n]?.done === true && isReps(sets[n]) && Number(sets[n].r) >= Number(target))
  })
}

const dayOf = w => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w?.d || '')) return null
  const date = new Date(`${w.d}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === w.d ? w.d : null
}
const mondayOf = iso => {
  const [y, m, d] = iso.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 12))
  utc.setUTCDate(utc.getUTCDate() - ((utc.getUTCDay() + 6) % 7))
  return utc.toISOString().slice(0, 10)
}
const milestones = [
  { id: 'first-workout', name: 'First Hero Workout', at: 1, xp: 50 },
  { id: 'hero-initiation', name: 'Hero Initiation', at: 3, xp: 60 },
  { id: 'five-workouts', name: 'Steady Training', at: 5, xp: 100 },
  { id: 'hero-discipline', name: 'Hero Discipline', at: 6, xp: 120 },
  { id: 'ten-workouts', name: 'Ten Hero Workouts', at: 10, xp: 150 },
]
export const SAITAMA_MILESTONES = Object.freeze(milestones)

/** Pure ledger. Count workouts only once by ID; daily/weekly bonuses once per date/week.
 * It intentionally excludes imported or pre-Phase-3 history without proof. */
export function deriveAnimeRpg(workouts, path = PATH) {
  const config = ANIME_RPG_PATHS[path] || ANIME_RPG_PATHS[PATH]
  const seen = new Set()
  const qualifying = safeArray(workouts).filter(w => {
    if (!isQualifiedAnimeWorkout(w) || w.animeAscension.path !== path || !dayOf(w) || seen.has(String(w.id))) return false
    seen.add(String(w.id))
    return true
  }).sort((a, b) => a.d.localeCompare(b.d) || Number(a.end) - Number(b.end) || String(a.id).localeCompare(String(b.id)))
  const days = new Set(), weeks = new Map(), awards = []
  const award = (key, xp, label, workout) => awards.push({ key, xp, label, workoutId: String(workout.id), day: workout.d })
  qualifying.forEach((w, index) => {
    award(`workout:${w.id}`, 100, `Complete ${config.quest} Workout`, w)
    if (!days.has(w.d)) { days.add(w.d); award(`daily:${w.d}`, 30, `Daily ${config.quest} Quest`, w) }
    const monday = mondayOf(w.d)
    const count = (weeks.get(monday) || 0) + 1
    weeks.set(monday, count)
    if (count === 3) award(`weekly:${monday}`, 75, `Weekly ${config.quest} Quest`, w)
    for (const m of milestones) if (index + 1 === m.at) award(`milestone:${m.id}`, m.xp, m.name.replaceAll('Hero', config.quest), w)
  })
  const xp = awards.reduce((sum, a) => sum + a.xp, 0)
  const count = qualifying.length
  // Current/next arcs are derived, not independently incremented or stored.
  const arcs = [
    { id: 'candidate', name: config.arcs[0], completed: Math.min(count, 6), total: 6, unlocked: true },
    { id: 'c-class', name: config.arcs[1], completed: Math.max(0, Math.min(count - 6, 6)), total: 6, unlocked: count >= 6 },
  ]
  const rank = count >= 12 ? config.ranks[2] : count >= 6 ? config.ranks[1] : config.ranks[0]
  let level = 1, remaining = xp
  while (remaining >= 100 + 25 * (level - 1)) {
    remaining -= 100 + 25 * (level - 1)
    level++
  }
  return {
    path, count, xp, level, nextLevelXp: 100 + 25 * (level - 1), levelXp: remaining,
    rank, arcs, qualifyingIds: qualifying.map(w => String(w.id)),
    achievements: milestones.map(m => ({ ...m, name: m.name.replaceAll('Hero', config.quest), progress: Math.min(count, m.at), earned: count >= m.at })),
    awards: awards.slice().reverse(),
    completedDays: [...days], completedWeeks: [...weeks.entries()].map(([start, count]) => ({ start, count })),
  }
}

/** Rewards earned by adding a qualifying workout to this user's existing history.
 * Source of truth is deriveAnimeRpg; no client-side XP counter or separately
 * claimable rewards. Re-deriving after edits/deletions is deterministic.
 */
export function animeRewardDifference(workouts, workout) {
  if (!isQualifiedAnimeWorkout(workout) || !dayOf(workout)) {
    return { eligible: false, total: 0, awards: [] }
  }
  const path = workout.animeAscension.path
  const without = safeArray(workouts).filter(w => String(w?.id) !== String(workout.id))
  const before = deriveAnimeRpg(without, path)
  const after = deriveAnimeRpg([...without, workout], path)
  const existingKeys = new Set(before.awards.map(a => a.key))
  return {
    eligible: true,
    total: Math.max(0, after.xp - before.xp),
    awards: after.awards.filter(a => !existingKeys.has(a.key)).reverse(),
  }
}

/** Estimate potential rewards for an active Anime Ascension workout.
 * The hypothetical saved record uses the *current exercise identities*, but
 * models the user completing every outstanding prescribed set. A swapped,
 * excluded, or structurally modified routine therefore cannot appear eligible.
 */
export function previewAnimeWorkoutRewards(active, workouts) {
  const snap = active?.animeAscension
  if (snap?.v !== 1 || !isAnimePath(snap?.path) || active.backfill || active.editingWorkoutId) return null
  const reqs = safeArray(snap.requirements)
  if (!reqs.length) return null
  const entries = safeArray(active.entries)
  const structurallyEligible = entries.length === reqs.length && reqs.every((req, i) =>
    entries[i]?.id === req.id && entries[i]?.noProg !== true &&
    safeArray(entries[i]?.sets).length === safeArray(req.reps).length &&
    safeArray(req.reps).every(safePositive))
  if (!structurallyEligible) return {
    eligible: false, total: 0, awards: [], completed: 0,
    required: reqs.reduce((sum, req) => sum + safeArray(req.reps).length, 0),
    reason: 'The original exercise selection or set structure has changed. RPG credit is currently limited to the original prescription.',
  }
  let completed = 0
  const imaginedEntries = entries.map((entry, i) => ({
    ...entry,
    sets: entry.sets.map((set, j) => {
      if (set.done === true && Number(set.r) >= Number(reqs[i].reps[j])) completed++
      return { ...set, done: true, r: Math.max(Number(set.r) || 0, Number(reqs[i].reps[j])) }
    }),
  }))
  // Use a synthetic ID that cannot clash with the store's saved IDs.
  const known = new Set(safeArray(workouts).map(w => String(w.id)))
  let id = `anime-preview:${active.id || 'session'}`
  while (known.has(id)) id += ':preview'
  const potential = {
    id,
    d: active.d,
    end: Date.now(),
    routineId: snap.routineId,
    routineIds: [snap.routineId],
    animeAscension: snap,
    entries: imaginedEntries,
  }
  const reward = animeRewardDifference(workouts, potential)
  return { ...reward, completed, required: reqs.reduce((sum, r) => sum + r.reps.length, 0),
    ready: completed === reqs.reduce((sum, r) => sum + r.reps.length, 0),
  }
}

/** Contribution of the saved workout to the derived RPG state; used in
 * openGym's existing completion summary after the save succeeds. */
export function completedAnimeWorkoutRewards(workout, workouts) {
  if (!workout?.animeAscension) return null
  return animeRewardDifference(workouts, workout)
}

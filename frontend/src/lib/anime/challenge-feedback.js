/** Read-only MVP feedback over openGym's saved workouts and challenge receipt.
 * Do not persist an extra award/status ledger: edits, deletes, and restores must
 * re-evaluate the same workout proof as XP and the tier ladder.
 */
import { isQualifiedAnimeWorkout } from './rpg.js'
import { CHALLENGES, challengeTierStates, deriveChallenge, exerciseReps } from './challenges.js'

const list = value => Array.isArray(value) ? value : []
const same = (a, b) => String(a) === String(b)
const routineIds = w => list(w?.routineIds ?? (w?.routineId ? [w.routineId] : []))
const readable = value => Number.isFinite(value) ? value : 'not recorded'

/** An error that identifies why openGym's Done label did not earn RPG credit. */
export function animeWorkoutProofIssue(workout) {
  const proof = workout?.animeAscension
  if (!proof) return 'No Anime Ascension proof was captured when this workout started. Start the assigned trial from openGym Plan; Repeat Workout and Log Past do not create trial proof. Exercises recorded as cardio/time instead of repetitions also cannot qualify.'
  if (workout?.excludeFromProgression === true) return 'This workout was excluded from progression.'
  if (routineIds(workout).length !== 1 || !same(routineIds(workout)[0], proof.routineId))
    return 'The saved routine no longer matches the original assigned trial.'
  if (!list(proof.requirements).length) return 'The workout has no recorded exercise prescription.'
  const exercises = list(workout.entries)
  if (exercises.length !== proof.requirements.length)
    return 'The number of logged exercises differs from the prescribed workout.'
  for (let i = 0; i < proof.requirements.length; i++) {
    const req = proof.requirements[i]
    const entry = exercises[i]
    if (!same(entry?.id, req?.id) || entry?.noProg === true)
      return `Exercise ${i + 1} was replaced or excluded from progression.`
    const sets = list(entry?.sets)
    const targets = list(req?.reps)
    if (!targets.length || sets.length !== targets.length)
      return `Exercise ${i + 1} has a different number of sets from its prescription.`
    for (let j = 0; j < targets.length; j++) {
      if (sets[j]?.done !== true)
        return `Exercise ${i + 1}, set ${j + 1} was not marked complete.`
      if (!(Number(sets[j]?.r) > 0))
        return `Exercise ${i + 1}, set ${j + 1} has no repetition count (it may have been logged as cardio).`
      if (Number(sets[j].r) < Number(targets[j]))
        return `Exercise ${i + 1}, set ${j + 1} needs at least ${targets[j]} repetitions; ${sets[j].r} were recorded.`
    }
  }
  return isQualifiedAnimeWorkout(workout) ? null : 'The saved workout did not pass the Anime Ascension proof checks.'
}

export function challengeWorkoutFeedback(state) {
  const mode = state?.animeAscension?.challengeMode
  if (!mode?.id || !Array.isArray(mode.routineIds)) return null
  const attempts = list(state?.animeAscension?.challenges?.[mode.path])
  const attempt = attempts.findLast(a => a?.id === mode.id && a?.startedAt === mode.startedAt)
  if (!attempt) return null
  const progress = deriveChallenge(state.workouts, attempt)
  if (!progress) return null
  const owned = new Set(mode.routineIds.map(String))
  const candidate = list(state?.workouts)
    .filter(w => Number.isFinite(Number(w?.end)) && Number(w.end) >= attempt.startedAt &&
      (routineIds(w).some(id => owned.has(String(id))) ||
        (w?.animeAscension?.challengeId === mode.id && w?.animeAscension?.path === mode.path)))
    .sort((a, b) => Number(b.end) - Number(a.end) || String(b.id).localeCompare(String(a.id)))[0]
  if (!candidate) return null
  const n = mode.routineIds.findIndex(id => routineIds(candidate).some(rid => same(rid, id))) + 1
  const session = n || progress.count + 1
  if (progress.ids.includes(String(candidate.id))) return {
    kind: 'credited', session,
    title: `Trial ${session} credited`,
    detail: `${progress.count} of ${progress.sessions} challenge sessions verified. Your workout and assessment records are saved.`,
  }
  let issue = animeWorkoutProofIssue(candidate)
  if (!issue && candidate.animeAscension?.challengeId !== mode.id)
    issue = 'This workout was not started under the current challenge.'
  if (!issue && attempt.v === 3) {
    const expectedId = attempt.routineIds?.[progress.count]
    if (!same(candidate.animeAscension?.routineId, expectedId))
      issue = `The next required workout is Trial ${progress.count + 1}. Start that assigned routine from Plan.`
  }
  if (!issue && progress.ids.some(id => list(state.workouts).find(w => String(w.id) === id)?.d === candidate.d))
    issue = 'A trial was already credited on this calendar date. Normal challenges require different workout days.'
  if (!issue && attempt.v === 3) {
    const obj = attempt.objective
    const reps = exerciseReps(candidate, obj?.anchorId)
    const target = progress.count + 1 === obj?.checkpointAt
      ? Math.max(obj.checkpointTotal, (progress.objective?.baseline || 0) + 1)
      : progress.count + 1 === progress.sessions
        ? Math.max(obj.finalTotal, (progress.objective?.baseline || 0) + obj.minGain)
        : null
    if (target !== null && (reps === null || reps < target))
      issue = `Assessment target not reached: ${readable(reps)} of ${target} required repetitions.`
    else if (progress.count === 0 && reps === null)
      issue = 'The opening assessment exercise did not record a complete repetition baseline.'
  }
  return { kind: 'uncredited', session,
    title: `Trial ${session} saved, but not credited`,
    detail: issue || 'The saved session did not satisfy the challenge sequence. Review the assigned trial and its recorded sets.',
  }
}

/** Display the last return receipt without inventing or storing additional XP. */
export function restoredChallengeSummary(state) {
  const restore = state?.animeAscension?.lastChallengeRestore
  if (!restore?.completed || !CHALLENGES[restore.id]) return null
  const definition = CHALLENGES[restore.id]
  const history = list(state?.animeAscension?.challenges?.[definition.path])
  const stages = challengeTierStates(state.workouts, definition.path, history)
  const current = stages.find(t => t.id === restore.id)
  if (!current?.progress?.finished) return {
    valid: false, name: definition.name,
    detail: 'The saved workout history changed after this challenge finished, so its badge or XP may no longer qualify. Review your workout history.',
  }
  const next = stages.find(t => t.tier === current.tier + 1 && t.unlocked && t.status === 'available')
  return {
    valid: true, name: definition.name, xp: current.progress.bonusXp,
    completedOn: current.progress.completedOn,
    nextTier: next?.name || null,
    restored: list(restore.preservedDays).length === 0,
    preservedDays: list(restore.preservedDays),
  }
}

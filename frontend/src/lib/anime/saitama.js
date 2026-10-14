// Anime Ascension / Saitama foundation prototype.
// AGPL-3.0-or-later. Kept independent of React, storage, and the catalogue file format.
// Only maps reviewed, beginner-friendly movement slots into openGym's native routine shape.

const normal = value => String(value || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
const bodyweight = ex => ['body weight', 'bodyweight', 'none'].includes(normal(ex.eq))
const dumbbell = ex => normal(ex.eq) === 'dumbbell'
const unsafeAdvanced = /\b(jump|explosive|plyometric|clap|handstand|weighted|pistol|burpee|decline)\b/

// Candidates are searched in preference order. A missing movement stays missing:
// we never disguise a leg curl as a hinge or a shoulder press as a horizontal push.
const slots = {
  push: [
    /\bwall push ?up\b/, /\bincline push ?up\b/,
    /\bknee(?:ling)? push ?up\b/, /^push ?up$/,
  ],
  squat: [ /\bbodyweight squat\b/, /^squat$/, /\bair squat\b/, /\bsit to stand\b/ ],
  bridge: [ /\bglute bridge\b/, /\bhip bridge\b/ ],
  core: [ /\bdead bug\b/, /\bbird dog\b/, /^plank$/ ],
  alternateCore: [ /\bbird dog\b/, /\bdead bug\b/, /\bside plank\b/ ],
  row: [ /\bone arm dumbbell row\b/, /\bsingle arm dumbbell row\b/, /\bbent over dumbbell row\b/ ],
}

function findExercise(exercises, patterns, equipTest, eligible) {
  const valid = exercises.filter(ex => ex && ex.id && ex.n && equipTest(ex) &&
    !unsafeAdvanced.test(normal(ex.n)) && eligible(ex))
  for (const pattern of patterns) {
    const found = valid.filter(ex => pattern.test(normal(ex.n)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0]
    if (found) return found
  }
  return null
}

/**
 * Constructs an ordinary openGym plan. This deliberately does NOT award XP or
 * assert that a workout was completed; those are future integration boundaries.
 * Returns null instead of fabricating exercises when the base catalogue is missing.
 *
 * @param {{catalogue: object[], uid: () => string, equipment?: string[],
 *          isAvailable?: (equipment: string[], exercise: object) => boolean}} args
 */
export function buildSaitamaFoundation({ catalogue, uid, equipment, isAvailable = () => true }) {
  if (!Array.isArray(catalogue) || typeof uid !== 'function') return null
  // Even a catalogue "body weight" exercise can require a bench or pull-up bar.
  // Always apply openGym's full eligibility check; do not bypass accessories.
  const kit = Array.isArray(equipment) ? equipment : []
  const available = ex => (bodyweight(ex) || kit.includes('dumbbell')) && isAvailable(kit, ex)
  const picked = Object.fromEntries(Object.entries(slots).map(([name, candidates]) => [
    name,
    findExercise(catalogue, candidates, name === 'row' ? dumbbell : bodyweight, available),
  ]))
  // Push, squat, bridge and trunk control are mandatory; pulling is optional
  // until a demonstrably usable dumbbell or secure bar is available.
  if (!picked.push || !picked.squat || !picked.bridge || !picked.core) return null

  const make = (key, title, prescription) => ({
    id: uid(),
    name: `Saitama · ${title}`,
    emoji: 'figureStrength',
    ex: prescription.filter(([exercise]) => !!exercise).map(([exercise, sets, reps]) => ({
      id: exercise.id, sets, reps, weight: 0,
    })),
  })
  const routines = [
    make('a', 'Hero Foundation A', [
      [picked.push, 2, 6], [picked.squat, 2, 8],
      [picked.bridge, 2, 8], [picked.core, 2, 6],
      [picked.row, 2, 8],
    ]),
    make('b', 'Hero Foundation B', [
      [picked.squat, 2, 8], [picked.push, 2, 6],
      [picked.alternateCore || picked.core, 2, 6], [picked.bridge, 2, 8],
      [picked.row, 2, 8],
    ]),
    make('c', 'Hero Foundation C', [
      [picked.push, 2, 6], [picked.bridge, 2, 8],
      [picked.squat, 2, 8], [picked.core, 2, 6],
      [picked.row, 2, 8],
    ]),
  ]
  // Monday, Wednesday, Friday: openGym's existing planner handles scheduling.
  return {
    routines,
    schedule: [1, 3, 5].map((day, index) => ({ day, routineId: routines[index].id })),
  }
}

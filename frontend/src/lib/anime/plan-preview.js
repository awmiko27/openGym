// Read-only workout preview. Reuses the very same pure generators invoked by
// openGym's Anime Ascension starter-plan handlers; never writes a routine or ID.
import { buildSaitamaFoundation } from './saitama.js'
import { buildCharacterFoundation } from './character-paths.js'
import { CANON_PROGRAMS } from './canon-programs.js'
import { chooseBackMovements } from './back-movements.js'

export const WEEKDAY_LABELS = Object.freeze(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])

/**
 * @param {{path:string, catalogue:object[], equipment?:string[]|null,
 *   isAvailable?:(equipment:string[], exercise:object)=>boolean, profile?:object}} args
 * @returns {object|null} The actual exercises/working sets the loader will plan.
 */
export function createAnimePlanPreview({ path, catalogue, equipment, isAvailable = () => true, profile = {} }) {
  const design = CANON_PROGRAMS[path]
  if (!design || !Array.isArray(catalogue)) return null
  let index = 0
  const args = { catalogue, equipment, isAvailable, profile, uid: () => `preview-${++index}` }
  const native = path === 'saitama'
    ? buildSaitamaFoundation(args)
    : buildCharacterFoundation(path, args)
  if (!native || native.routines.length !== design.days.length || native.schedule.length !== design.days.length) return null

  const byId = new Map(catalogue.map(ex => [ex.id, ex]))
  const routines = new Map(native.routines.map(r => [r.id, r]))
  const days = design.days.map(day => {
    const assignment = native.schedule.find(s => s.day === day.day)
    const routine = routines.get(assignment?.routineId)
    if (!routine || !routine.ex?.length) return null
    const exercises = routine.ex.map(row => {
      const exercise = byId.get(row.id)
      if (!exercise) return null
      return { id: row.id, name: exercise.n || 'Unnamed exercise', equipment: exercise.eq || '', sets: row.sets, reps: row.reps }
    })
    if (exercises.some(e => !e)) return null
    return { ...day, weekday: WEEKDAY_LABELS[day.day], routineName: routine.name, exercises,
      workingSets: exercises.reduce((sum, ex) => sum + Number(ex.sets || 0), 0) }
  })
  if (days.some(day => !day)) return null
  const scheduled = new Set(days.map(day => day.day))
  const available = ex => equipment == null || isAvailable(equipment, ex)
  const back = chooseBackMovements(catalogue, available)
  return {
    path, title: design.title, week: Math.max(1, Number(profile.trainingWeek) || 1),
    days, restDays: WEEKDAY_LABELS.filter((_, i) => !scheduled.has(i)),
    workoutCount: days.length,
    totalWorkingSets: days.reduce((sum, day) => sum + day.workingSets, 0),
    backBalanceNote: back.row ? null : back.support
      ? 'No resistance row is available with these equipment settings. Prone upper-back movements help shoulder control, but do not replace pulling against resistance. Add a band or dumbbells in openGym Settings if available.'
      : 'No resistance row or prone upper-back movement is available with these equipment settings. This plan uses other available movements instead; consider enabling a band or dumbbells in openGym Settings if you have them.',
  }
}

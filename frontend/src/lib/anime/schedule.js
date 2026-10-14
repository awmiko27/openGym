/** Keep old Anime Ascension weekdays tidy without deleting a user's custom plan.
 * Only clear a previously managed day when its routine IDs still match the
 * exact IDs this feature installed. Legacy plans with no receipt are untouched.
 * Called after openGym's own loadStarterPlan applies the new character plan.
 */
export function reconcileAnimeSchedule(week, previousReceipt, newDays) {
  if (!week || !Array.isArray(newDays)) return {}
  const days = new Set(newDays)
  for (const [key, ids] of Object.entries(previousReceipt || {})) {
    const day = Number(key)
    if (!Number.isInteger(day) || days.has(day) || !Array.isArray(ids)) continue
    const current = week[day]
    if (Array.isArray(current) && current.length === ids.length &&
        current.every((id, index) => String(id) === String(ids[index]))) {
      week[day] = []
    }
  }
  return Object.fromEntries(newDays.map(day =>
    [day, Array.isArray(week[day]) ? [...week[day]] : []]))
}

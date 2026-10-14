// Anime Ascension preferences. Weight and equipment live in openGym's native
// bodyweight history and equipment profiles; do not store duplicate copies here.
export const ANIME_PATHS = Object.freeze([
  { id: 'saitama', title: 'Saitama', series: 'One Punch Man', focus: 'Calisthenics and endurance', available: true },
  { id: 'goku', title: 'Goku', series: 'Dragon Ball', focus: 'Strength and conditioning', available: false },
  { id: 'jinwoo', title: 'Sung Jinwoo', series: 'Solo Leveling', focus: 'Hunter missions and balanced training', available: false },
])

export const GOALS = Object.freeze(['general', 'strength', 'endurance', 'conditioning'])
export const EXPERIENCE = Object.freeze(['beginner', 'intermediate', 'advanced'])
export const EQUIPMENT_ACTIVE = 'active'
export const EQUIPMENT_BODYWEIGHT = 'bodyweight'
const PROFILE_PREFIX = 'profile:'

export function profileDraft(saved) {
  const p = saved && typeof saved === 'object' ? saved : {}
  return {
    path: 'saitama',
    ageYears: p.ageYears == null ? '' : String(p.ageYears),
    heightCm: p.heightCm == null ? '' : String(p.heightCm),
    goal: GOALS.includes(p.goal) ? p.goal : 'general',
    experience: EXPERIENCE.includes(p.experience) ? p.experience : 'beginner',
  }
}

function optionalNumber(raw, min, max, label, errors) {
  if (raw == null || String(raw).trim() === '') return null
  const text = String(raw).trim()
  const n = Number(text)
  if (!/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(n) || n < min || n > max) {
    errors.push(`${label} must be between ${min} and ${max}.`)
    return null
  }
  return n
}

export function validateAnimeProfile(input) {
  const errors = []
  if (input?.path !== 'saitama') errors.push('Only Saitama is available in this phase.')
  if (!GOALS.includes(input?.goal)) errors.push('Choose a valid fitness goal.')
  if (!EXPERIENCE.includes(input?.experience)) errors.push('Choose a valid experience level.')
  const ageYears = optionalNumber(input?.ageYears, 18, 100, 'Age', errors)
  if (ageYears === null && String(input?.ageYears ?? '').trim() === '') errors.push('Enter your age (18+).')
  if (ageYears !== null && !Number.isInteger(ageYears)) errors.push('Age must be a whole number.')
  const heightCm = optionalNumber(input?.heightCm, 100, 250, 'Height', errors)
  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    value: {
      v: 2,
      path: 'saitama',
      ageYears,
      heightCm,
      goal: input.goal,
      experience: input.experience,
    },
  }
}

// Equipment choice is transient to this plan load. It is never saved in
// S.animeAscension: openGym's activeEquipId and equipProfiles remain authoritative.
export function selectedEquipmentProfile(profiles, id) {
  return (Array.isArray(profiles) ? profiles : []).find(p => p?.id === id) || null
}

export function equipmentChoiceForProfile(id) {
  return `${PROFILE_PREFIX}${id}`
}

export function resolveAnimeEquipment(profiles, activeEquipId, choice = EQUIPMENT_ACTIVE) {
  if (choice === EQUIPMENT_BODYWEIGHT) return { ok: true, profile: null }
  let profileId
  if (choice === EQUIPMENT_ACTIVE) profileId = activeEquipId
  else if (typeof choice === 'string' && choice.startsWith(PROFILE_PREFIX)) profileId = choice.slice(PROFILE_PREFIX.length)
  else return { ok: false, error: 'Choose a valid equipment option.' }

  if (!profileId && choice === EQUIPMENT_ACTIVE) return { ok: true, profile: null }
  const profile = selectedEquipmentProfile(profiles, profileId)
  if (!profile) return { ok: false, error: 'The selected openGym equipment profile is no longer available. Choose another profile or bodyweight only.' }
  return { ok: true, profile }
}

// Anime Ascension phase 2 profile contract, intentionally independent of openGym internals.
// These fields describe onboarding preferences; they do not prescribe exercise intensity.
export const ANIME_PATHS = Object.freeze([
  { id: 'saitama', title: 'Saitama', series: 'One Punch Man', focus: 'Calisthenics and endurance', available: true },
  { id: 'goku', title: 'Goku', series: 'Dragon Ball', focus: 'Strength and conditioning', available: false },
  { id: 'jinwoo', title: 'Sung Jinwoo', series: 'Solo Leveling', focus: 'Hunter missions and balanced training', available: false },
])

export const GOALS = Object.freeze(['general', 'strength', 'endurance', 'conditioning'])
export const EXPERIENCE = Object.freeze(['beginner', 'intermediate', 'advanced'])

export function profileDraft(saved) {
  const p = saved && typeof saved === 'object' ? saved : {}
  return {
    path: 'saitama',
    ageYears: p.ageYears == null ? '' : String(p.ageYears),
    heightCm: p.heightCm == null ? '' : String(p.heightCm),
    weightKg: p.weightKg == null ? '' : String(p.weightKg),
    goal: GOALS.includes(p.goal) ? p.goal : 'general',
    experience: EXPERIENCE.includes(p.experience) ? p.experience : 'beginner',
    equipmentProfileId: typeof p.equipmentProfileId === 'string' ? p.equipmentProfileId : '',
    limitations: false, // Never infer or silently carry forward a health clearance.
    ready: false,
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

export function validateAnimeProfile(input, availableProfiles = []) {
  const errors = []
  if (input?.path !== 'saitama') errors.push('Only Saitama is available in this phase.')
  if (!GOALS.includes(input?.goal)) errors.push('Choose a valid fitness goal.')
  if (!EXPERIENCE.includes(input?.experience)) errors.push('Choose a valid experience level.')
  const ageYears = optionalNumber(input?.ageYears, 18, 100, 'Age', errors)
  if (ageYears === null && String(input?.ageYears ?? '').trim() === '') errors.push('Enter your age (18+).')
  if (ageYears !== null && !Number.isInteger(ageYears)) errors.push('Age must be a whole number.')
  const heightCm = optionalNumber(input?.heightCm, 100, 250, 'Height', errors)
  const weightKg = optionalNumber(input?.weightKg, 25, 350, 'Weight', errors)
  const equipmentProfileId = input?.equipmentProfileId || ''
  if (equipmentProfileId && !availableProfiles.some(p => p?.id === equipmentProfileId)) {
    errors.push('The selected equipment profile no longer exists.')
  }
  if (input?.limitations) errors.push('Please resolve exercise limitations with a qualified professional before loading this preset.')
  if (input?.ready !== true) errors.push('Confirm you have reviewed the readiness notice.')
  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    value: {
      v: 1,
      path: 'saitama',
      ageYears,
      heightCm,
      weightKg,
      goal: input.goal,
      experience: input.experience,
      equipmentProfileId,
      // Attestation is for UX only, not a clinical screening or professional clearance.
      readinessAcknowledgedAt: new Date().toISOString(),
    },
  }
}

export function selectedEquipmentProfile(profiles, id) {
  return (Array.isArray(profiles) ? profiles : []).find(p => p?.id === id) || null
}

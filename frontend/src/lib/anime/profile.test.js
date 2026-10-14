import { describe, it, expect } from 'vitest'
import { ANIME_PATHS, profileDraft, validateAnimeProfile, selectedEquipmentProfile } from './profile.js'
const valid = { path: 'saitama', goal: 'general', experience: 'beginner', equipmentProfileId: '', ageYears: '25', ready: true, limitations: false }
describe('Anime Ascension phase 2 onboarding', () => {
  it('offers only Saitama as available', () => expect(ANIME_PATHS.filter(x => x.available).map(x => x.id)).toEqual(['saitama']))
  it('allows adult bodyweight-only setup with optional measurements absent', () => {
    const x = validateAnimeProfile(valid)
    expect(x.ok).toBe(true)
    expect(x.value.equipmentProfileId).toBe('')
    expect(x.value.weightKg).toBe(null)
  })
  it('rejects unapproved characters', () => expect(validateAnimeProfile({ ...valid, path: 'goku' }).ok).toBe(false))
  it('rejects underage values and invalid numbers', () => {
    expect(validateAnimeProfile({ ...valid, ageYears: '17' }).ok).toBe(false)
    expect(validateAnimeProfile({ ...valid, heightCm: 'Infinity' }).ok).toBe(false)
  })
  it('does not let arbitrary profile IDs bypass equipment validation', () => {
    expect(validateAnimeProfile({ ...valid, equipmentProfileId: 'other-user' }, [{ id: 'my-id' }]).ok).toBe(false)
  })
  it('requires readiness and stops when a limitation is flagged', () => {
    expect(validateAnimeProfile({ ...valid, ready: false }).ok).toBe(false)
    expect(validateAnimeProfile({ ...valid, limitations: true }).ok).toBe(false)
  })
  it('prefills saved values without repeating an old readiness acknowledgment', () => {
    const d = profileDraft({ goal: 'endurance', weightKg: 71, ready: true })
    expect(d.weightKg).toBe('71')
    expect(d.ready).toBe(false)
  })
  it('chooses exactly the named equipment profile', () => {
    const p = { id: 'home', name: 'Home' }
    expect(selectedEquipmentProfile([p], 'home')).toBe(p)
    expect(selectedEquipmentProfile([p], 'gym')).toBe(null)
  })
})

import { describe, it, expect } from 'vitest'
import {
  ANIME_PATHS, EQUIPMENT_ACTIVE, EQUIPMENT_BODYWEIGHT,
  equipmentChoiceForProfile, profileDraft, resolveAnimeEquipment, validateAnimeProfile,
} from './profile.js'

const valid = { path: 'saitama', goal: 'general', experience: 'beginner', ageYears: '25' }

describe('Anime Ascension onboarding — openGym data reuse', () => {
  it('offers only Saitama as available', () => expect(ANIME_PATHS.filter(x => x.available).map(x => x.id)).toEqual(['saitama']))
  it('stores only the anime-specific fields', () => {
    const x = validateAnimeProfile({
      ...valid, weightKg: '71', equipmentProfileId: 'home', ready: false, limitations: true,
    })
    expect(x.ok).toBe(true)
    expect(x.value).toEqual({ v: 2, path: 'saitama', ageYears: 25, heightCm: null, goal: 'general', experience: 'beginner' })
    expect(x.value).not.toHaveProperty('weightKg')
    expect(x.value).not.toHaveProperty('equipmentProfileId')
    expect(x.value).not.toHaveProperty('readinessAcknowledgedAt')
  })
  it('does not require the removed checkboxes', () => {
    expect(validateAnimeProfile(valid).ok).toBe(true)
    expect(validateAnimeProfile({ ...valid, ready: false, limitations: true }).ok).toBe(true)
  })
  it('rejects unavailable characters and malformed profile fields', () => {
    expect(validateAnimeProfile({ ...valid, path: 'goku' }).ok).toBe(false)
    expect(validateAnimeProfile({ ...valid, ageYears: '17' }).ok).toBe(false)
    expect(validateAnimeProfile({ ...valid, ageYears: '25.5' }).ok).toBe(false)
    expect(validateAnimeProfile({ ...valid, heightCm: 'Infinity' }).ok).toBe(false)
  })
  it('prefills the original profile without carrying duplicate weight, equipment or checkbox values', () => {
    const draft = profileDraft({ goal: 'endurance', ageYears: 29, heightCm: 174, weightKg: 71, equipmentProfileId: 'home', ready: true, limitations: true })
    expect(draft).toEqual({ path: 'saitama', ageYears: '29', heightCm: '174', goal: 'endurance', experience: 'beginner' })
  })
  it('uses the openGym active equipment profile by default', () => {
    const home = { id: 'home', name: 'Home' }
    const gym = { id: 'gym', name: 'Gym' }
    expect(resolveAnimeEquipment([home, gym], 'home').profile).toBe(home)
    expect(resolveAnimeEquipment([home, gym], 'gym', EQUIPMENT_ACTIVE).profile).toBe(gym)
  })
  it('accepts a bodyweight-only option and a one-time equipment override', () => {
    const home = { id: 'home', name: 'Home' }
    const gym = { id: 'gym', name: 'Gym' }
    expect(resolveAnimeEquipment([home, gym], 'home', EQUIPMENT_BODYWEIGHT)).toEqual({ ok: true, profile: null })
    expect(resolveAnimeEquipment([home, gym], 'home', equipmentChoiceForProfile('gym')).profile).toBe(gym)
    expect(resolveAnimeEquipment([home, gym], null)).toEqual({ ok: true, profile: null })
  })
  it('fails closed when active or selected equipment was removed', () => {
    const profiles = [{ id: 'home' }]
    expect(resolveAnimeEquipment(profiles, 'deleted').ok).toBe(false)
    expect(resolveAnimeEquipment(profiles, 'home', equipmentChoiceForProfile('deleted')).ok).toBe(false)
    expect(resolveAnimeEquipment(profiles, 'home', 'nonsense').ok).toBe(false)
  })
})

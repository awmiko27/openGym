import { describe, it, expect } from 'vitest'
import {
  ANIME_PATHS, profileDraft, validateAnimeProfile,
} from './profile.js'
import { activeProfile } from '../equipment.js'

const valid = { path: 'saitama', goal: 'general', experience: 'beginner', ageYears: '25' }

describe('Anime Ascension onboarding — openGym data reuse', () => {
  it('offers all three character paths', () => expect(ANIME_PATHS.filter(x => x.available).map(x => x.id)).toEqual(['saitama', 'goku', 'jinwoo']))
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
  it('accepts each path and rejects unknown characters and malformed fields', () => {
    expect(validateAnimeProfile({ ...valid, path: 'goku' }).value.path).toBe('goku')
    expect(validateAnimeProfile({ ...valid, path: 'jinwoo' }).value.path).toBe('jinwoo')
    expect(validateAnimeProfile({ ...valid, path: 'unknown' }).ok).toBe(false)
    expect(validateAnimeProfile({ ...valid, ageYears: '17' }).ok).toBe(false)
    expect(validateAnimeProfile({ ...valid, ageYears: '25.5' }).ok).toBe(false)
    expect(validateAnimeProfile({ ...valid, heightCm: 'Infinity' }).ok).toBe(false)
  })
  it('prefills the original profile without carrying duplicate weight, equipment or checkbox values', () => {
    const draft = profileDraft({ goal: 'endurance', ageYears: 29, heightCm: 174, weightKg: 71, equipmentProfileId: 'home', ready: true, limitations: true })
    expect(draft).toEqual({ path: 'saitama', ageYears: '29', heightCm: '174', goal: 'endurance', experience: 'beginner' })
    expect(profileDraft({ ...draft, path: 'jinwoo' }).path).toBe('jinwoo')
  })
  it('honors openGym when equipment filtering is off, even if a profile is selected', () => {
    const everything = { id: 'all', name: 'Everything', equipment: ['barbell'] }
    const S = { equipFilterOn: false, activeEquipId: 'all', equipProfiles: [everything] }
    expect(activeProfile(S)).toBeNull()
  })
  it('honors openGym when equipment filtering is on with a valid active profile', () => {
    const everything = { id: 'all', name: 'Everything', equipment: ['barbell'] }
    const S = { equipFilterOn: true, activeEquipId: 'all', equipProfiles: [everything] }
    expect(activeProfile(S)).toBe(everything)
    expect(activeProfile({ ...S, activeEquipId: 'removed' })).toBeNull()
  })
})

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { loadStarterPlan } from '../sheets.jsx'
import { scheduleModeOf } from '../lib/rotation.js'
import { ANIME_PATHS, profileDraft, selectedEquipmentProfile, validateAnimeProfile } from '../lib/anime/profile.js'

const goals = [
  ['general', 'General fitness'], ['strength', 'Strength'],
  ['endurance', 'Endurance'], ['conditioning', 'Conditioning'],
]

/**
 * Phase 2: explicit, opt-in anime onboarding on top of openGym's native plans.
 * No separate workout engine, unreviewed exercise prescriptions, or XP mutations.
 */
export default function AnimeAscension() {
  const navigate = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const profiles = S.equipProfiles || []
  const [draft, setDraft] = useState(() => profileDraft(S.animeAscension))
  const [page, setPage] = useState('setup')
  const [errors, setErrors] = useState([])
  const [loadingError, setLoadingError] = useState('')
  const set = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setErrors([]); setLoadingError('') }
  const selected = selectedEquipmentProfile(profiles, draft.equipmentProfileId)
  const review = () => {
    const result = validateAnimeProfile(draft, profiles)
    if (!result.ok) { setErrors(result.errors); return }
    setErrors([])
    setPage('review')
  }
  const confirm = () => {
    const result = validateAnimeProfile(draft, profiles)
    if (!result.ok) { setErrors(result.errors); setPage('setup'); return }
    if (S.active) { setLoadingError('Finish or exit your current workout before loading a new plan.'); return }
    if (scheduleModeOf(S) === 'rotation') { setLoadingError('Switch to Fixed Week under Plan before loading this Monday/Wednesday/Friday starter plan. Your current rotation will not be overwritten.'); return }
    try {
      // The upstream plan loader reuses identical routines and updates Mon/Wed/Fri.
      // With null, the Saitama generator deliberately defaults to bodyweight-only.
      const loaded = loadStarterPlan('saitama-foundation', selected)
      if (!loaded) {
        setLoadingError('No suitable workout could be built from the available exercise catalog and equipment. Nothing was changed.')
        return
      }
      update(st => { st.animeAscension = result.value })
      navigate('/plan')
    } catch {
      setLoadingError('The program could not be loaded. Your existing workouts are unchanged; review your plan before trying again.')
    }
  }
  return <main className="narrow aa-page">
    <div className="aa-hero">
      <p className="aa-kicker">ANIME ASCENSION · TRAINING PATHS</p>
      <h1>Train like a hero. Progress at your pace.</h1>
      <p>Choose an anime-inspired path while openGym handles exercise instructions, tracking, and your training calendar.</p>
      <button type="button" className="btn" onClick={() => navigate('/anime/rpg')}>View Hero status · XP &amp; quests</button>
    </div>
    <div className="aa-section" aria-label="Character training paths">
      <h2>Choose your training path</h2>
      <div className="aa-paths">
        {ANIME_PATHS.map(path => <div key={path.id} className={'aa-path' + (path.available ? ' selected' : ' unavailable')}>
          <span className="aa-path-icon" aria-hidden="true">{path.id === 'saitama' ? '👊' : path.id === 'goku' ? '⚡' : '⚔️'}</span>
          <div className="aa-path-copy">
            <strong>{path.title}</strong>
            <small>{path.series} · {path.focus}</small>
          </div>
          <span className="aa-path-status">{path.available ? 'Available' : 'Coming soon'}</span>
        </div>)}
      </div>
    </div>
    {page === 'setup' ? <form className="aa-section aa-form" onSubmit={e => { e.preventDefault(); review() }}>
      <h2>Your starting profile</h2>
      <p className="aa-note">Height and weight are optional and currently for your profile only. Age is required for the adult-only prototype. They do not yet change workout difficulty. The Saitama prototype is a fixed beginner foundation plan.</p>
      <div className="aa-fields">
        <label>Age (18+, required)<input type="number" min="18" max="100" step="1" value={draft.ageYears} onChange={e => set('ageYears', e.target.value)} /></label>
        <label>Height in cm (optional)<input type="number" min="100" max="250" step="0.1" value={draft.heightCm} onChange={e => set('heightCm', e.target.value)} /></label>
        <label>Weight in kg (optional)<input type="number" min="25" max="350" step="0.1" value={draft.weightKg} onChange={e => set('weightKg', e.target.value)} /></label>
        <label>Fitness goal<select value={draft.goal} onChange={e => set('goal', e.target.value)}>{goals.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
        <label>Experience<select value={draft.experience} onChange={e => set('experience', e.target.value)}>
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select></label>
        <label>Equipment profile<select value={draft.equipmentProfileId} onChange={e => set('equipmentProfileId', e.target.value)}>
          <option value="">Bodyweight only (no saved equipment profile)</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
      </div>
      <p className="aa-note">Manage dumbbells, machines, bars, and accessories in Settings → Equipment. An exercise may be unavailable even if categorized as bodyweight when it requires a bench or bar.</p>
      <label className="aa-check"><input type="checkbox" checked={draft.limitations} onChange={e => set('limitations', e.target.checked)} /> I have an injury or limitation that may affect these workouts.</label>
      <label className="aa-check"><input type="checkbox" checked={draft.ready} onChange={e => set('ready', e.target.checked)} /> I understand this is not medical clearance; I will stop for pain or warning symptoms and start at an appropriate effort.</label>
      {errors.length > 0 && <div role="alert" className="aa-errors">{errors.map((error, i) => <p key={i}>{error}</p>)}</div>}
      <button className="btn primary aa-main-button" type="submit">Review Saitama plan</button>
    </form> : <section className="aa-section">
      <h2>Review before loading</h2>
      <p><strong>Saitama · Hero Foundation</strong></p>
      <p>Three beginner sessions: Monday, Wednesday, Friday. The existing openGym trainer, rest timer, and exercise demonstrations remain in use.</p>
      <p><strong>Equipment:</strong> {selected ? selected.name : 'Bodyweight only'}</p>
      <p className="aa-warning">Loading this plan reassigns Monday, Wednesday, and Friday in your current fixed-week schedule. Existing workout history and routine records are retained. This does not modify your active session, and it does not enable a new RPG system.</p>
      {loadingError && <div role="alert" className="aa-errors">{loadingError}</div>}
      <div className="aa-actions">
        <button type="button" className="btn" onClick={() => { setPage('setup'); setLoadingError('') }}>Back to profile</button>
        <button type="button" className="btn primary" onClick={confirm}>Load training plan</button>
      </div>
    </section>}
    <p className="aa-credits">Powered by the openGym training engine. Anime-inspired names are for this noncommercial fan project.</p>
  </main>
}

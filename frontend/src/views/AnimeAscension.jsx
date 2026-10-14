import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { loadStarterPlan } from '../sheets.jsx'
import { activeProfile } from '../lib/equipment.js'
import { scheduleModeOf } from '../lib/rotation.js'
import { ANIME_PATHS, profileDraft, validateAnimeProfile } from '../lib/anime/profile.js'

const PLANS = {
  saitama: { id: 'saitama-foundation', name: 'Saitama · Hero Foundation', details: 'A — Strength, B — Endurance, C — Conditioning' },
  goku: { id: 'goku-foundation', name: 'Goku · Saiyan Foundation', details: 'A — Strength, B — Power, C — Conditioning' },
  jinwoo: { id: 'jinwoo-foundation', name: 'Sung Jinwoo · Hunter Foundation', details: 'A — Strength, B — Agility, C — Endurance' },
}

const goals = [
  ['general', 'General fitness'], ['strength', 'Strength'],
  ['endurance', 'Endurance'], ['conditioning', 'Conditioning'],
]

/** Anime path onboarding; openGym alone owns weight and equipment settings. */
export default function AnimeAscension() {
  const navigate = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [draft, setDraft] = useState(() => profileDraft(S.animeAscension))
  const [page, setPage] = useState('setup')
  const [errors, setErrors] = useState([])
  const [loadingError, setLoadingError] = useState('')
  const set = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setErrors([]); setLoadingError('') }
  const review = () => {
    const result = validateAnimeProfile(draft)
    if (!result.ok) { setErrors(result.errors); return }
    setErrors([])
    setPage('review')
  }
  const confirm = () => {
    const result = validateAnimeProfile(draft)
    if (!result.ok) {
      setErrors(result.errors)
      setPage('setup')
      return
    }
    if (S.active) { setLoadingError('Finish or exit your current workout before loading a new plan.'); return }
    if (scheduleModeOf(S) === 'rotation') { setLoadingError('Switch to Fixed Week under Plan before loading this Monday/Wednesday/Friday starter plan. Your current rotation will not be overwritten.'); return }
    try {
      // Respect openGym's own equipment-filter toggle and active profile.
      // When filtering is off, activeProfile returns null (all equipment),
      // so the starter plan loads as written without imposing restrictions.
      const loaded = loadStarterPlan(PLANS[result.value.path].id, activeProfile(useStore.getState().S), result.value)
      if (!loaded) {
        setLoadingError('No suitable workout could be built from the available exercise catalog and equipment. Nothing was changed.')
        return
      }
      // Replace the old Phase 2 profile only after the plan loads successfully.
      // Legacy duplicate weight, equipment and checkbox fields are retired.
      // No openGym bodyweight or equipment settings are modified.
      update(st => { st.animeAscension = result.value })
      navigate('/plan')
    } catch (error) {
      console.error('Anime Ascension plan load failed:', error)
      setLoadingError('The program could not be loaded. Check the browser console for the underlying error.')
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
        {ANIME_PATHS.map(path => <button type="button" key={path.id} aria-pressed={draft.path === path.id}
          onClick={() => { set('path', path.id); setPage('setup') }}
          className={'aa-path' + (draft.path === path.id ? ' selected' : '')}>
          <span className="aa-path-icon" aria-hidden="true">{path.id === 'saitama' ? '👊' : path.id === 'goku' ? '⚡' : '⚔️'}</span>
          <div className="aa-path-copy">
            <strong>{path.title}</strong>
            <small>{path.series} · {path.focus}</small>
          </div>
          <span className="aa-path-status">{draft.path === path.id ? 'Selected' : 'Choose path'}</span>
        </button>)}
      </div>
    </div>
    {page === 'setup' ? <form className="aa-section aa-form" onSubmit={e => { e.preventDefault(); review() }}>
      <h2>Your starting profile</h2>
      <p className="aa-note">Age and optional height are saved for your Anime Ascension profile. Experience and goal adjust the selected character's starting sets and repetitions; age 70+ caps advanced volume. Height is informational only. Equipment continues to follow openGym Settings.</p>
      <div className="aa-fields">
        <label>Age (18+, required)<input type="number" min="18" max="100" step="1" value={draft.ageYears} onChange={e => set('ageYears', e.target.value)} /></label>
        <label>Height in cm (optional)<input type="number" min="100" max="250" step="0.1" value={draft.heightCm} onChange={e => set('heightCm', e.target.value)} /></label>
        <label>Fitness goal<select value={draft.goal} onChange={e => set('goal', e.target.value)}>{goals.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
        <label>Experience<select value={draft.experience} onChange={e => set('experience', e.target.value)}>
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select></label>
      </div>
      {errors.length > 0 && <div role="alert" className="aa-errors">{errors.map((error, i) => <p key={i}>{error}</p>)}</div>}
      <button className="btn primary aa-main-button" type="submit">Review {ANIME_PATHS.find(path => path.id === draft.path)?.title} plan</button>
    </form> : <section className="aa-section">
      <h2>Review before loading</h2>
      <p><strong>{PLANS[draft.path].name}</strong></p>
      <p>{PLANS[draft.path].details}. Monday / Wednesday / Friday. Experience and goal adjust starting volume. Exercises follow openGym equipment Settings; existing demonstrations, workout logging, and character-specific XP continue to work.</p>
      <p className="aa-warning">Loading this plan reassigns Monday, Wednesday, and Friday in your current fixed-week schedule. Existing workout history and routine records are retained. An active session will not be replaced.</p>
      {loadingError && <div role="alert" className="aa-errors">{loadingError}</div>}
      <div className="aa-actions">
        <button type="button" className="btn" onClick={() => { setPage('setup'); setLoadingError('') }}>Back to profile</button>
        <button type="button" className="btn primary" onClick={confirm}>Load training plan</button>
      </div>
    </section>}
    <p className="aa-credits">Powered by the openGym training engine. Anime-inspired names are for this noncommercial fan project.</p>
  </main>
}

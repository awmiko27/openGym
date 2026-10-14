import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { bwSheet, loadStarterPlan } from '../sheets.jsx'
import { lastBW } from '../lib/history.js'
import { fmtDate, fmtNum } from '../lib/format.js'
import { scheduleModeOf } from '../lib/rotation.js'
import {
  ANIME_PATHS, EQUIPMENT_ACTIVE, EQUIPMENT_BODYWEIGHT,
  equipmentChoiceForProfile, profileDraft, resolveAnimeEquipment, validateAnimeProfile,
} from '../lib/anime/profile.js'

const goals = [
  ['general', 'General fitness'], ['strength', 'Strength'],
  ['endurance', 'Endurance'], ['conditioning', 'Conditioning'],
]

/** Anime path onboarding; openGym owns body weight and equipment management. */
export default function AnimeAscension() {
  const navigate = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const profiles = S.equipProfiles || []
  const latestWeight = lastBW(S)
  const [draft, setDraft] = useState(() => profileDraft(S.animeAscension))
  // This is a one-time plan-loading override, not a second equipment preference.
  const [equipmentChoice, setEquipmentChoice] = useState(EQUIPMENT_ACTIVE)
  const [page, setPage] = useState('setup')
  const [errors, setErrors] = useState([])
  const [loadingError, setLoadingError] = useState('')
  const set = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setErrors([]); setLoadingError('') }
  const equipment = resolveAnimeEquipment(profiles, S.activeEquipId, equipmentChoice)
  const activeProfile = resolveAnimeEquipment(profiles, S.activeEquipId)
  const selected = equipment.ok ? equipment.profile : null
  const review = () => {
    const result = validateAnimeProfile(draft)
    const nextErrors = [...(result.ok ? [] : result.errors), ...(equipment.ok ? [] : [equipment.error])]
    if (nextErrors.length) { setErrors(nextErrors); return }
    setErrors([])
    setPage('review')
  }
  const confirm = () => {
    const result = validateAnimeProfile(draft)
    const currentEquipment = resolveAnimeEquipment(profiles, S.activeEquipId, equipmentChoice)
    if (!result.ok || !currentEquipment.ok) {
      setErrors([...(result.ok ? [] : result.errors), ...(currentEquipment.ok ? [] : [currentEquipment.error])])
      setPage('setup')
      return
    }
    if (S.active) { setLoadingError('Finish or exit your current workout before loading a new plan.'); return }
    if (scheduleModeOf(S) === 'rotation') { setLoadingError('Switch to Fixed Week under Plan before loading this Monday/Wednesday/Friday starter plan. Your current rotation will not be overwritten.'); return }
    try {
      // Reuse openGym's existing exercise catalog, routines, and equipment profile.
      // null means bodyweight only; no second equipment inventory is created.
      const loaded = loadStarterPlan('saitama-foundation', currentEquipment.profile)
      if (!loaded) {
        setLoadingError('No suitable workout could be built from the available exercise catalog and equipment. Nothing was changed.')
        return
      }
      // Replace the old Phase 2 profile only after the plan loads successfully.
      // Legacy weight, equipment ID and checkbox fields are retired. This does
      // not modify S.bodyweight, S.equipProfiles or S.activeEquipId.
      update(st => { st.animeAscension = result.value })
      navigate('/plan')
    } catch {
      setLoadingError('The program could not be loaded. Review your plan before trying again.')
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
      <p className="aa-note">Age and optional height are saved for your Anime Ascension profile. Weight and equipment come from openGym. The Saitama program is still a fixed beginner foundation plan; these values do not yet adjust the workout.</p>
      <div className="aa-fields">
        <label>Age (18+, required)<input type="number" min="18" max="100" step="1" value={draft.ageYears} onChange={e => set('ageYears', e.target.value)} /></label>
        <label>Height in cm (optional)<input type="number" min="100" max="250" step="0.1" value={draft.heightCm} onChange={e => set('heightCm', e.target.value)} /></label>
        <label>Fitness goal<select value={draft.goal} onChange={e => set('goal', e.target.value)}>{goals.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
        <label>Experience<select value={draft.experience} onChange={e => set('experience', e.target.value)}>
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select></label>
        <label>Equipment for this plan<select value={equipmentChoice} onChange={e => { setEquipmentChoice(e.target.value); setErrors([]); setLoadingError('') }}>
          <option value={EQUIPMENT_ACTIVE}>Use openGym active profile ({activeProfile.ok ? activeProfile.profile?.name || 'none — bodyweight only' : 'unavailable'})</option>
          <option value={EQUIPMENT_BODYWEIGHT}>Bodyweight only</option>
          {profiles.map(p => <option key={p.id} value={equipmentChoiceForProfile(p.id)}>{p.name} (one-time override)</option>)}
        </select></label>
      </div>
      <div className="aa-linked-data">
        <div><strong>Body weight · openGym</strong><p>{latestWeight ? `${fmtNum(latestWeight.w)} ${S.unit || 'kg'} · ${fmtDate(latestWeight.d, true)}` : 'No weigh-in recorded in openGym yet.'}</p></div>
        <button type="button" className="btn" onClick={() => bwSheet()}>Log weight in openGym</button>
      </div>
      {!latestWeight && Number(S.animeAscension?.weightKg) > 0 && <p className="aa-note">Your older Anime Ascension entry was {S.animeAscension.weightKg} kg. It was not an openGym weigh-in; log it above if you want to keep it in your weight history before loading a new plan.</p>}
      <p className="aa-note">Manage equipment in Settings → Equipment. Changing your active openGym profile before loading updates the default automatically. An override applies only to this plan load.</p>
      {errors.length > 0 && <div role="alert" className="aa-errors">{errors.map((error, i) => <p key={i}>{error}</p>)}</div>}
      <button className="btn primary aa-main-button" type="submit">Review Saitama plan</button>
    </form> : <section className="aa-section">
      <h2>Review before loading</h2>
      <p><strong>Saitama · Hero Foundation</strong></p>
      <p>Three beginner sessions: Monday, Wednesday, Friday. The existing openGym trainer, rest timer, and exercise demonstrations remain in use.</p>
      <p><strong>Equipment:</strong> {equipment.ok ? selected?.name || 'Bodyweight only' : equipment.error}</p>
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

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { loadStarterPlan } from '../sheets.jsx'
import { activeProfile, eqAvailable } from '../lib/equipment.js'
import { EXIDX } from '../lib/exercises.js'
import { scheduleModeOf } from '../lib/rotation.js'
import { ANIME_PATHS, profileDraft, validateAnimeProfile } from '../lib/anime/profile.js'
import { deriveTrainingArc, startTrainingArc } from '../lib/anime/training.js'
import { challengeTierStates } from '../lib/anime/challenges.js'
import { reconcileChallengeReturn, activeChallengeProgress } from '../lib/anime/challenge-mode.js'
import { CANON_PROGRAMS } from '../lib/anime/canon-programs.js'
import { createAnimePlanPreview } from '../lib/anime/plan-preview.js'
import { reconcileAnimeSchedule } from '../lib/anime/schedule.js'
import AnimePlanReview from './AnimePlanReview.jsx'
import AnimeProgression from './AnimeProgression.jsx'
import AnimeChallenges from './AnimeChallenges.jsx'
import './anime-dashboard.css'

const PLANS = {
  saitama: { id: 'saitama-foundation', name: 'Saitama · Hero Foundation', icon: '👊' },
  goku: { id: 'goku-foundation', name: 'Goku · Saiyan Foundation', icon: '⚡' },
  jinwoo: { id: 'jinwoo-foundation', name: 'Sung Jinwoo · Hunter Foundation', icon: '⚔️' },
}
const goals = [
  ['general', 'General fitness'], ['strength', 'Strength'],
  ['endurance', 'Endurance'], ['conditioning', 'Conditioning'],
]

/** Character dashboard; equipment and workout records remain owned by openGym. */
export default function AnimeAscension() {
  const navigate = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [draft, setDraft] = useState(() => profileDraft(S.animeAscension))
  const [page, setPage] = useState('dashboard')
  const [errors, setErrors] = useState([])
  const [loadingError, setLoadingError] = useState('')
  const [modeSyncError, setModeSyncError] = useState('')
  const mode = S.animeAscension?.challengeMode
  // Reconcile a saved challenge session when the dashboard is revisited.
  // No mutations while openGym has an active workout. Repeated calls are safe.
  useEffect(() => {
    if (!mode || S.active) return
    const progress = activeChallengeProgress(S)
    const count = progress?.count || 0
    const shouldAdvance = mode.v === 2 && Number.isInteger(mode.cycleSize) && mode.cycleSize > 0 &&
      count > 0 && count % mode.cycleSize === 0 && Math.floor(count / mode.cycleSize) > mode.blockIndex
    if (!progress?.finished && !shouldAdvance) return // avoid unnecessary store updates
    try {
      let transition = { action: 'none' }
      update(st => {
        if (st.animeAscension?.challengeMode?.startedAt !== mode.startedAt ||
            st.animeAscension?.challengeMode?.id !== mode.id) return
        transition = reconcileChallengeReturn(st)
      })
      if (transition.action === 'completed') {
        setDraft(old => ({ ...old, path: transition.previousPath }))
      }
      setModeSyncError('')
    } catch (error) {
      console.error('Anime Ascension challenge transition:', error)
      setModeSyncError(error.message || 'Could not update the challenge calendar.')
    }
  }, [mode, S.active, S.workouts, update])
  const design = CANON_PROGRAMS[draft.path]
  const program = S.animeAscension?.programs?.[draft.path]
  const arc = deriveTrainingArc(S.workouts, draft.path, program)
  const savedChallenges = S.animeAscension?.challenges?.[draft.path] || []
  const challengeStages = challengeTierStates(S.workouts, draft.path, savedChallenges)
  const completedChallenges = challengeStages.filter(t => t.status === 'completed').length
  const ongoingChallenge = challengeStages.find(t => t.status === 'in-progress')
  const nextChallenge = challengeStages.find(t => t.canStart)

  const previewWeek = arc?.started && !arc.completed ? arc.week : 1
  // The same character builders, exercise index, eligibility function and
  // input profile that openGym's loadStarterPlan uses. No state is mutated.
  const preview = useMemo(() => page !== 'review' ? null : createAnimePlanPreview({
    path: draft.path, catalogue: Object.values(EXIDX), equipment: activeProfile(S),
    isAvailable: eqAvailable, profile: { ...draft, trainingWeek: previewWeek },
  }), [page, draft, S, previewWeek])

  const set = (key, value) => {
    setDraft(old => ({ ...old, [key]: value }))
    setErrors([])
    setLoadingError('')
  }
  const goReview = () => {
    const result = validateAnimeProfile(draft)
    if (!result.ok) {
      setErrors(result.errors)
      setPage('profile')
      return
    }
    setErrors([])
    setLoadingError('')
    setPage('review')
  }
  const confirm = () => {
    const result = validateAnimeProfile(draft)
    if (!result.ok) { setErrors(result.errors); setPage('profile'); return }
    if (S.active) { setLoadingError('Finish or exit your current workout before loading a new plan.'); return }
    if (S.animeAscension?.challengeMode) { setLoadingError('Complete or cancel your current challenge before loading another training plan.'); return }
    if (scheduleModeOf(S) === 'rotation') {
      setLoadingError('Switch to Fixed Week under Plan before loading this character-specific program. Your rotation is unchanged.')
      return
    }
    if (!preview) { setLoadingError('No suitable plan was generated for the current exercise catalog and equipment settings.'); return }
    try {
      const current = useStore.getState().S
      if (current.active || current.animeAscension?.challengeMode) throw Error('Workout or challenge mode is still active.')
      const previous = current.animeAscension || {}
      const existingProgram = previous.programs?.[result.value.path]
      const actualArc = deriveTrainingArc(current.workouts, result.value.path, existingProgram)
      const trainingWeek = actualArc.started && !actualArc.completed ? actualArc.week : 1
      const loaded = loadStarterPlan(PLANS[result.value.path].id,
        activeProfile(current), { ...result.value, trainingWeek })
      if (!loaded) { setLoadingError('The exercises could not be loaded with openGym’s current settings. Your plan was not replaced.'); return }
      update(st => {
        const old = st.animeAscension || {}
        const base = old.programs?.[result.value.path]?.v === 1
          ? old.programs[result.value.path] : startTrainingArc()
        const managedSchedule = reconcileAnimeSchedule(st.week, old.managedSchedule,
          CANON_PROGRAMS[result.value.path].days.map(d => d.day))
        st.animeAscension = { ...old, ...result.value, managedSchedule, programs: {
          ...(old.programs || {}), [result.value.path]: { ...base, loadedWeek: trainingWeek },
        } }
      })
      navigate('/plan')
    } catch (error) {
      console.error('Anime Ascension plan load failed:', error)
      setLoadingError('The plan could not be loaded. Check the browser console for details.')
    }
  }

  return <main className="narrow aa-page aa-redesign">
    {page === 'dashboard' && <>
      <header className="aa-redesign-header">
        <div><p className="aa-kicker">ANIME ASCENSION</p><h1>Your training path</h1>
          <p>Choose your character and see what's next.</p></div>
        <button className="btn" type="button" onClick={() => navigate('/anime/rpg')}>Hero status ↗</button>
      </header>
      {modeSyncError && <p className="aa-redesign-caution" role="alert">{modeSyncError}</p>}
      {S.animeAscension?.lastChallengeRestore?.completed && <p role="status" className="aa-challenge-success">Challenge completed! Your training arc and original schedule have been restored. The challenge badge and bonus XP appear in your Hero Status.</p>}
      {mode && <div className="aa-mode-banner" role="status">
        <strong>Special challenge mode · {CANON_PROGRAMS[mode.path]?.title}</strong>
        <p>Your training arc is paused. Finish or cancel the challenge to restore your normal plan.</p>
        <button className="btn" type="button" onClick={() => { set('path', mode.path); setPage('challenges') }}>Manage active challenge →</button>
      </div>}
      {S.animeAscension?.lastChallengeRestore?.preservedDays?.length > 0 && <p className="aa-redesign-caution">Your last challenge ended with manual calendar changes preserved. Review those weekdays in openGym Plan.</p>}
      <section aria-label="Choose a character" className="aa-redesign-characters">
        {ANIME_PATHS.map(path => <button type="button" key={path.id}
          className={'aa-redesign-character' + (draft.path === path.id ? ' is-selected' : '')}
          aria-pressed={draft.path === path.id} onClick={() => set('path', path.id)}>
          <span aria-hidden="true" className="aa-redesign-avatar">{PLANS[path.id]?.icon || '★'}</span>
          <strong>{path.title}</strong><small>{path.series}</small>
        </button>)}
      </section>
      <section className="aa-redesign-feature" aria-label="Selected training path">
        <div className="aa-redesign-feature-copy">
          <span className="aa-redesign-eyebrow">SELECTED PROGRAM</span>
          <h2>{design.title}</h2>
          <p>{design.adaptation}</p>
          <div className="aa-redesign-chips">
            <span>{design.days.length} workout days</span><span>{arc.totalWeeks} weeks</span>
            <span>{arc.started ? arc.phase : 'Foundation'}</span>
          </div>
        </div>
        <div className="aa-redesign-primary-actions">
          <button type="button" className="btn primary" disabled={Boolean(mode)} onClick={goReview}>Review training plan →</button>
          <button type="button" className="btn" onClick={() => { setErrors([]); setPage('profile') }}>Edit training profile</button>
        </div>
      </section>
      <div className="aa-redesign-overview-grid">
        <section className="aa-redesign-mini" aria-label="Current training arc">
          <div className="aa-redesign-mini-head"><h3>Training arc</h3><span>{arc.started ? `Week ${arc.week}/${arc.totalWeeks}` : 'Not started'}</span></div>
          {arc.started ? <><p>{mode?.path === draft.path ? `${arc.phase} · Paused for challenge` : arc.phase}</p><progress max={arc.required} value={arc.done} aria-label="Training week progress" />
            <small>{arc.done} of {arc.required} verified workouts this week</small></> :
            <p>Load a plan to start your multiweek progression.</p>}
          <button type="button" className="aa-redesign-text-action" onClick={() => setPage('arc')}>View training arc →</button>
        </section>
        <section className="aa-redesign-mini" aria-label="Character challenges">
          <div className="aa-redesign-mini-head"><h3>Challenges</h3><span>{completedChallenges} of 3 badges</span></div>
          {ongoingChallenge ? <><p>{ongoingChallenge.name}</p><progress max={ongoingChallenge.sessions} value={ongoingChallenge.progress.count} aria-label="Current challenge progress" />
            <small>{ongoingChallenge.progress.count}/{ongoingChallenge.sessions} workouts credited</small></> :
            nextChallenge ? <p>Next trial: {nextChallenge.name} · {nextChallenge.days} days</p> :
              <p>{completedChallenges === 3 ? 'All three challenges completed!' : 'Complete the previous challenge to unlock the next.'}</p>}
          <button type="button" className="aa-redesign-text-action" onClick={() => setPage('challenges')}>Explore challenges →</button>
        </section>
      </div>
      <details className="aa-redesign-info aa-redesign-canon"><summary>What inspires {design.title}'s training?</summary>
        <p>{design.benchmark} is a story benchmark, not a mandatory daily prescription. Our real-world program progresses toward these themes at a manageable pace.</p>
      </details>
    </>}

    {page === 'profile' && <section className="aa-section aa-redesign-setup">
      <button type="button" className="btn" onClick={() => { setPage('dashboard'); setErrors([]) }}>← Back to dashboard</button>
      <p className="aa-redesign-eyebrow">TRAINING PROFILE</p>
      <h2>Set your starting difficulty</h2>
      <p className="aa-note">Your experience and goal determine initial sets and reps. Height is optional and informational. openGym Settings remain the only equipment configuration.</p>
      <form onSubmit={e => { e.preventDefault(); goReview() }}>
        <div className="aa-fields">
          <label>Age (18+, required)<input type="number" min="18" max="100" step="1" value={draft.ageYears} onChange={e => set('ageYears', e.target.value)} /></label>
          <label>Height in cm (optional)<input type="number" min="100" max="250" step="0.1" value={draft.heightCm} onChange={e => set('heightCm', e.target.value)} /></label>
          <label>Fitness goal<select value={draft.goal} onChange={e => set('goal', e.target.value)}>{goals.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
          <label>Experience<select value={draft.experience} onChange={e => set('experience', e.target.value)}>
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select></label>
        </div>
        {errors.length > 0 && <div role="alert" className="aa-errors">{errors.map((error, i) => <p key={i}>{error}</p>)}</div>}
        <button type="submit" className="btn primary aa-main-button">Preview my workouts →</button>
      </form>
    </section>}

    {page === 'review' && <AnimePlanReview key={draft.path} path={draft.path} preview={preview} profile={draft}
      onBack={() => { setPage('dashboard'); setLoadingError('') }} onLoad={confirm}
      loadingError={loadingError} activeWorkout={Boolean(S.active)} />}

    {page === 'arc' && <div className="aa-redesign-progress-page">
      <button type="button" className="btn" onClick={() => setPage('dashboard')}>← Back to dashboard</button>
      <AnimeProgression path={draft.path} onLoadWeek={goReview} />
    </div>}
    {page === 'challenges' && <div className="aa-redesign-progress-page">
      <button type="button" className="btn" onClick={() => setPage('dashboard')}>← Back to dashboard</button>
      {modeSyncError && <p role="alert" className="aa-redesign-caution">{modeSyncError}</p>}
      <AnimeChallenges path={draft.path} onExit={path => set('path', path)} />
    </div>}
    <p className="aa-credits">Uses openGym for equipment, exercise demonstrations, and workout tracking. Character programs are noncommercial fan adaptations.</p>
  </main>
}

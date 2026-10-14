import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { deriveAnimeRpg, ANIME_RPG_PATHS } from '../lib/anime/rpg.js'

const progress = (done, total) => Math.min(100, Math.max(0, Math.round(done / total * 100)))

export default function AnimeRPG() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [path, setPath] = useState(() => ANIME_RPG_PATHS[S.animeAscension?.path] ? S.animeAscension.path : 'saitama')
  const rpg = useMemo(() => deriveAnimeRpg(S.workouts, path), [S.workouts, path])
  const config = ANIME_RPG_PATHS[path]
  const hasProfile = Boolean(ANIME_RPG_PATHS[S.animeAscension?.path])
  const today = new Date()
  const localDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const dayDone = rpg.completedDays.includes(localDay)
  return <main className="narrow aa-page">
    <div className="aa-hero">
      <p className="aa-kicker">ANIME ASCENSION · HERO STATUS</p>
      <h1>{config.title}</h1>
      <p>Levels, ranks and rewards derived from qualified workouts in your openGym history. No second workout logger or editable XP balance.</p>
    </div>
    <section className="aa-section aa-rpg-paths" aria-label="Character progression">
      {Object.entries(ANIME_RPG_PATHS).map(([id, p]) => <button key={id} type="button" className={'btn' + (path === id ? ' primary' : '')} aria-pressed={path === id} onClick={() => setPath(id)}>{p.title.split(' · ')[0]}</button>)}
    </section>
    {!hasProfile && <section className="aa-section" role="status"><h2>Choose your training path</h2><p>Set up a character under Training paths first. Earlier sessions without completion proof are not eligible for RPG rewards.</p><button className="btn primary" onClick={() => nav('/anime')}>Training paths</button></section>}
    <section className="aa-section" aria-label="Hero status">
      <div className="aa-rpg-stats">
        <div><strong>Level {rpg.level}</strong><small>{rpg.levelXp} / {rpg.nextLevelXp} XP to next level</small></div>
        <div><strong>{rpg.rank}</strong><small>Character rank</small></div>
        <div><strong>{rpg.xp} XP</strong><small>{rpg.count} qualified workouts</small></div>
      </div>
      <progress max={rpg.nextLevelXp} value={rpg.levelXp} aria-label="Experience toward next level" className="aa-rpg-bar" />
    </section>
    <section className="aa-section"><h2>Training arcs</h2>
      {rpg.arcs.map(arc => <div className="aa-rpg-record" key={arc.id}>
        <div className="aa-rpg-between"><strong>{arc.name}</strong><span>{arc.completed}/{arc.total} workouts</span></div>
        <progress max={arc.total} value={arc.completed} aria-label={`${arc.name} arc progress`} className="aa-rpg-bar" />
        {!arc.unlocked && <small className="aa-note">Unlocks after {config.arcs[0]}</small>}
      </div>)}
    </section>
    <section className="aa-section"><h2>Quests</h2>
      <div className="aa-rpg-between"><span>Daily {config.quest} Quest</span><strong>{dayDone ? 'Completed · +30 XP' : 'Complete 1 workout · +30 XP'}</strong></div>
      <p className="aa-note">Only the first qualifying workout on a calendar day grants daily quest XP.</p>
      <div className="aa-rpg-between"><span>Weekly {config.quest} Quest</span><strong>3 workouts · +75 XP</strong></div>
      <p className="aa-note">Resets every Monday; earned once for the third qualified workout in a week.</p>
    </section>
    <section className="aa-section"><h2>Achievements</h2>
      {rpg.achievements.map(a => <div className="aa-rpg-record" key={a.id}>
        <div className="aa-rpg-between"><strong>{a.name}</strong><span>{a.earned ? `Unlocked · +${a.xp} XP` : `${a.progress}/${a.at} · +${a.xp} XP`}</span></div>
        <progress max={a.at} value={a.progress} aria-label={`${a.name}: ${progress(a.progress, a.at)} percent`} className="aa-rpg-bar" />
      </div>)}
    </section>
    <section className="aa-section"><h2>Recent rewards</h2>
      {rpg.awards.length === 0 ? <p className="aa-note">No qualifying workouts for this character yet. Start a session from this character's Foundation plan and complete its required exercises and reps.</p> :
        <ul className="aa-rpg-awards">{rpg.awards.slice(0, 10).map(a => <li key={a.key}><span>{a.label}<small>{a.day}</small></span><strong>+{a.xp} XP</strong></li>)}</ul>}
      <p className="aa-note">Qualifying requires the planned exercise, each prescribed working set and the target repetitions. Finishing early, skipping movements, swapping exercises, or editing history below the target removes eligibility. This strict rule is temporary until equipment-aware RPG challenges are designed.</p>
    </section>
    <button className="btn" onClick={() => nav('/anime')}>Back to training paths</button>
  </main>
}

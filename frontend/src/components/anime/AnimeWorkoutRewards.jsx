import { previewAnimeWorkoutRewards, completedAnimeWorkoutRewards } from '../../lib/anime/rpg.js'

function RewardRows({ awards }) {
  return <ul className="aa-xp-breakdown">
    {awards.map(award => <li key={award.key}>
      <span>{award.label}</span><strong>+{award.xp} XP</strong>
    </li>)}
  </ul>
}

export function AnimeWorkoutRewards({ active, workouts }) {
  const result = previewAnimeWorkoutRewards(active, workouts)
  if (!result) return null
  return <aside className="aa-xp-panel" aria-label="Anime Ascension workout reward preview">
    <div className="aa-xp-heading">
      <strong>Hero Training rewards</strong>
      <strong>{result.eligible ? `Up to +${result.total} XP` : 'Not eligible'}</strong>
    </div>
    {result.eligible ? <>
      <RewardRows awards={result.awards} />
      <p className="aa-xp-help">{result.completed}/{result.required} required sets completed at target repetitions.
        {result.ready ? ' Finish and save to claim qualifying rewards.' : ' Complete all prescribed sets to qualify.'}
      </p>
      {result.total === 0 && <p className="aa-xp-help">No additional rewards available for this session.</p>}
    </> : <p className="aa-xp-help">{result.reason}</p>}
    <p className="aa-xp-help">Preview only. Rewards are calculated from the saved workout, and can change if it is finished early or edited.</p>
  </aside>
}

export function AnimeCompletedRewards({ workout, workouts }) {
  const reward = completedAnimeWorkoutRewards(workout, workouts)
  if (!reward) return null
  return <section className="aa-xp-panel" aria-label="Anime Ascension earned rewards">
    <div className="aa-xp-heading">
      <strong>Hero Training XP earned</strong><strong>+{reward.total} XP</strong>
    </div>
    {reward.eligible ? <>
      <RewardRows awards={reward.awards} />
      {reward.awards.length === 0 && <p className="aa-xp-help">No new quest rewards unlocked.</p>}
    </> : <p className="aa-xp-help">No RPG credit: this workout did not meet its original exercise and repetition targets.</p>}
  </section>
}

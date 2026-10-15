import { previewAnimeWorkoutRewards, completedAnimeWorkoutRewards } from '../../lib/anime/rpg.js'
import { animeWorkoutProofIssue } from '../../lib/anime/challenge-feedback.js'

const isTrial = workout => / · Trial (?:saitama|goku|jinwoo)-(?:7|14|30)$/.test(workout?.name || '')

function RewardRows({ awards }) {
  return <ul className="aa-xp-breakdown">
    {awards.map(award => <li key={award.key}>
      <span>{award.label}</span><strong>+{award.xp} XP</strong>
    </li>)}
  </ul>
}

export function AnimeWorkoutRewards({ active, workouts }) {
  const result = previewAnimeWorkoutRewards(active, workouts)
  if (!result && isTrial(active)) return <aside className="aa-xp-panel" role="alert" aria-label="Challenge verification unavailable">
    <strong>Challenge workout cannot be verified</strong>
    <p className="aa-xp-help">This session has no Anime Ascension proof. Saving it will not count toward the trial. Restart it from the assigned challenge routine in Plan; cardio/time sets cannot be used as repetition proof.</p>
  </aside>
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
  if (!reward && isTrial(workout)) return <section className="aa-xp-panel" role="status" aria-label="Challenge workout not credited">
    <strong>Workout saved in openGym, but challenge proof is missing</strong>
    <p className="aa-xp-help">{animeWorkoutProofIssue(workout)} This saved workout does not advance the challenge. Visit Anime Ascension → Challenges for your next assigned trial.</p>
  </section>
  if (!reward) return null
  return <section className="aa-xp-panel" aria-label="Anime Ascension earned rewards">
    <div className="aa-xp-heading">
      <strong>Hero Training XP earned</strong><strong>+{reward.total} XP</strong>
    </div>
    {reward.eligible ? <>
      <RewardRows awards={reward.awards} />
      {reward.awards.length === 0 && <p className="aa-xp-help">No new quest rewards unlocked.</p>}
      {workout.animeAscension?.challengeId && <p className="aa-xp-help">Workout XP verified. Challenge session credit and final-assessment targets are checked separately; view Anime Ascension → Challenges for the result.</p>}
    </> : <p className="aa-xp-help">No RPG credit: {animeWorkoutProofIssue(workout) || 'The saved workout did not meet the original prescription.'}</p>}
  </section>
}

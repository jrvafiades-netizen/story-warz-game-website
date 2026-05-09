import { useMemo, useState } from 'react';
import './App.css';
import storyWarzBanner from './assets/storywarzbanner.jpg';

type Player = {
  id: number;
  name: string;
  stories: string[];
  score: number;
};

type GameStep = 'theme' | 'players' | 'entry' | 'play' | 'suddenDeath' | 'gameOver';

const themes = [
  'first dates',
  'family vacations',
  'school disasters',
  'bad jobs',
  'secret talents',
  'celebrity encounters',
  'unexpected injuries',
  'terrible roommates',
  'holiday chaos',
  'near misses',
  'weird dreams',
  'childhood trouble',
];

const autofillStories = [
  'I once tried to impress someone by ordering in a fake accent and then forgot how to stop.',
  'A teacher called my parents because I submitted a book report on a movie I had never seen.',
  'I got locked outside during a snowstorm wearing one shoe and a bathrobe.',
  'At a wedding, I caught the bouquet and immediately dropped it into the cake.',
];

const rules = [
  "If the story displayed is YOUR STORY: Your goal is to fool the other players into thinking it's not your story. You earn 1 point for every person you fool.",
  'If the story displayed IS NOT yours: Your goal is to guess whose story it is. If you guess correctly, you earn 2 points.',
  'Double Points: At the halfway point of the game, all points earned that round are doubled.',
];

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function App() {
  const [step, setStep] = useState<GameStep>('theme');
  const [theme, setTheme] = useState(themes[0]);
  const [playerCount, setPlayerCount] = useState(3);
  const [entryIndex, setEntryIndex] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [currentStories, setCurrentStories] = useState(['', '', '', '']);
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Array<{ playerId: number; text: string }>>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [votes, setVotes] = useState<Record<number, number | ''>>({});
  const [showRules, setShowRules] = useState(false);
  const [wagers, setWagers] = useState<Record<number, number>>({});

  const currentStory = deck[storyIndex];
  const doublePoints = deck.length > 0 && storyIndex >= Math.floor(deck.length / 2);

  const tiedPlayers = useMemo(() => {
    if (players.length === 0) {
      return [];
    }

    const highScore = Math.max(...players.map((player) => player.score));
    return players.filter((player) => player.score === highScore);
  }, [players]);

  const randomTheme = () => {
    const options = themes.filter((item) => item !== theme);
    setTheme(options[Math.floor(Math.random() * options.length)]);
  };

  const resetEntryForm = () => {
    setCurrentName('');
    setCurrentStories(['', '', '', '']);
  };

  const submitPlayer = () => {
    const fallbackName = `Player ${entryIndex + 1}`;
    const stories = currentStories.map((story, index) =>
      story.trim() || `${fallbackName}'s mystery story ${index + 1}`,
    );
    const nextPlayers = [
      ...players,
      {
        id: entryIndex + 1,
        name: currentName.trim() || fallbackName,
        stories,
        score: 0,
      },
    ];

    setPlayers(nextPlayers);
    resetEntryForm();

    if (entryIndex + 1 === playerCount) {
      setDeck(
        shuffle(
          nextPlayers.flatMap((player) =>
            player.stories.map((story) => ({
              playerId: player.id,
              text: story,
            })),
          ),
        ),
      );
      setVotes({});
      setStoryIndex(0);
      setStep('play');
      return;
    }

    setEntryIndex(entryIndex + 1);
  };

  const scoreStory = () => {
    if (!currentStory) {
      return;
    }

    const multiplier = doublePoints ? 2 : 1;
    const scoredPlayers = players.map((player) => {
      let earned = 0;

      Object.entries(votes).forEach(([voterId, guessedId]) => {
        const voter = Number(voterId);

        if (guessedId === currentStory.playerId && voter !== currentStory.playerId) {
          earned += player.id === voter ? 2 : 0;
        }

        if (voter !== currentStory.playerId && guessedId !== currentStory.playerId) {
          earned += player.id === currentStory.playerId ? 1 : 0;
        }
      });

      return { ...player, score: player.score + earned * multiplier };
    });

    setPlayers(scoredPlayers);
    setVotes({});
    setRevealed(false);

    if (storyIndex + 1 >= deck.length) {
      const highScore = Math.max(...scoredPlayers.map((player) => player.score));
      const tied = scoredPlayers.filter((player) => player.score === highScore);
      setWagers(Object.fromEntries(tied.map((player) => [player.id, 0])));
      setStep(tied.length > 1 ? 'suddenDeath' : 'gameOver');
      return;
    }

    setStoryIndex(storyIndex + 1);
  };

  const finishSuddenDeath = () => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => ({
        ...player,
        score: player.score - (wagers[player.id] || 0),
      })),
    );
    setStep('gameOver');
  };

  const startFromScratch = () => {
    setStep('theme');
    setTheme(themes[0]);
    setPlayerCount(3);
    setEntryIndex(0);
    setPlayers([]);
    setDeck([]);
    setStoryIndex(0);
    setRevealed(false);
    setVotes({});
    setWagers({});
    resetEntryForm();
  };

  return (
    <main className="shell">
      <header className="site-header">
        <h1>
          <span className="title-story">Story</span> <span className="title-warz">Warz</span>
        </h1>
      </header>

      <img className="hero-banner" src={storyWarzBanner} alt="Story Warz" />

      {step === 'theme' && (
        <section className="panel">
          <h2>Choose a Theme</h2>
          <p>All stories this round must be about the chosen theme.</p>
          <div className="theme-display">{theme}</div>
          <div className="button-row">
            <button type="button" onClick={randomTheme}>
              Random Theme
            </button>
            <button type="button" onClick={() => setStep('players')}>
              Next
            </button>
            <button className="link-button" type="button" onClick={() => setShowRules(true)}>
          Rules
            </button>

          </div>
        </section>
      )}

      {step === 'players' && (
        <section className="panel">
          <h2>Select Number of Players</h2>
          <div className="segmented" aria-label="Select Number of Players">
            {[3, 4, 5].map((count) => (
              <button
                className={playerCount === count ? 'active' : ''}
                type="button"
                key={count}
                onClick={() => setPlayerCount(count)}
              >
                {count} Players
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep('entry')}>
            Next
          </button>
        </section>
      )}

      {step === 'entry' && (
        <section className="panel">
          <h2>Player {entryIndex + 1}, Enter Your Name</h2>
          <input
            aria-label="Your Name"
            placeholder="Your Name"
            value={currentName}
            onChange={(event) => setCurrentName(event.target.value)}
          />
          <h3>Enter Your 4 Stories</h3>
          <div className="story-fields">
            {currentStories.map((story, index) => (
              <textarea
                aria-label={`Story ${index + 1}`}
                key={index}
                placeholder={`Story ${index + 1}`}
                value={story}
                onChange={(event) => {
                  const nextStories = [...currentStories];
                  nextStories[index] = event.target.value;
                  setCurrentStories(nextStories);
                }}
              />
            ))}
          </div>
          <div className="button-row">
            <button type="button" onClick={submitPlayer}>
              Submit
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentStories(
                  autofillStories.map((story, index) => `${story} (${entryIndex + 1}.${index + 1})`),
                )
              }
            >
              Auto Fill
            </button>
          </div>
        </section>
      )}

      {step === 'play' && currentStory && (
        <section className="panel play-panel">
          <div className="story-meta">
            <h2>Story {storyIndex + 1}</h2>
            {doublePoints && <strong>DOUBLE POINTS</strong>}
          </div>
          <article className="story-card">{revealed ? currentStory.text : 'Ready?'}</article>

          {!revealed ? (
            <button type="button" onClick={() => setRevealed(true)}>
              Reveal
            </button>
          ) : (
            <>
              <div className="votes">
                {players.map((player) => (
                  <label key={player.id}>
                    {player.name}'s guess
                    <select
                      value={votes[player.id] ?? ''}
                      onChange={(event) =>
                        setVotes({
                          ...votes,
                          [player.id]: event.target.value ? Number(event.target.value) : '',
                        })
                      }
                    >
                      <option value="">Choose a player</option>
                      {players.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button type="button" onClick={scoreStory}>
                Next Story
              </button>
            </>
          )}
        </section>
      )}

      {step === 'suddenDeath' && (
        <section className="panel">
          <h2>Sudden Death!</h2>
          <p>
            Tied players must wager between 0 and all of their current points. After the round, the
            wager is subtracted from their score.
          </p>
          <div className="votes">
            {tiedPlayers.map((player) => (
              <label key={player.id}>
                {player.name}'s wager
                <input
                  min="0"
                  max={player.score}
                  type="number"
                  value={wagers[player.id] || 0}
                  onChange={(event) =>
                    setWagers({
                      ...wagers,
                      [player.id]: Math.min(player.score, Math.max(0, Number(event.target.value))),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={finishSuddenDeath}>
            Start Sudden Death Round
          </button>
        </section>
      )}

      {step === 'gameOver' && (
        <section className="panel">
          <h2>Final Scores</h2>
          <div className="scoreboard final">
            {players
              .toSorted((a, b) => b.score - a.score)
              .map((player) => (
                <div key={player.id}>
                  <span>{player.name}</span>
                  <strong>{player.score}</strong>
                </div>
              ))}
          </div>
          <button type="button" onClick={startFromScratch}>
            Start from scratch
          </button>
        </section>
      )}

      {players.length > 0 && (
        <aside className="scoreboard" aria-label="Scoreboard">
          {players.map((player) => (
            <div key={player.id}>
              <span>{player.name}</span>
              <strong>{player.score}</strong>
            </div>
          ))}
        </aside>
      )}

      <footer>
        <a href="https://www.youtube.com/@StoryWarz" target="_blank" rel="noreferrer">
          Watch Story Warz Online!
        </a>
      </footer>

      {showRules && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-label="Game Rules">
            <h3>Game Rules and Scoring</h3>
            {rules.map((rule) => (
              <p key={rule}>{rule}</p>
            ))}
            <hr />
            <h4>Sudden Death (Tiebreaker)</h4>
            <p>Triggered when two or more players are tied at the end of the game.</p>
            <p>
              Wager: Each tied player privately enters a wager between 0 and all of their current
              points. Wagers are locked in one at a time so opponents cannot see the amount.
            </p>
            <p>The story: A random unplayed story written by a non-tied player is revealed.</p>
            <p>Voting: Only tied players vote, and the dropdown only shows non-tied players.</p>
            <p>
              Scoring: After the round, each tied player's wager is subtracted from their score,
              then earned points are added. Highest score wins. No double points in sudden death.
            </p>
            <button type="button" onClick={() => setShowRules(false)}>
              Close
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;

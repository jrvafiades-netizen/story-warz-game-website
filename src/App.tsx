import { useMemo, useState } from 'react';
import './App.css';
import storyWarzBanner from './assets/storywarzbanner.jpg';
import {
  clampWager,
  createDeck,
  getSuddenDeathStory,
  getTiedPlayers,
  isDoublePointsRound,
  scoreSuddenDeath,
  scorePlayers,
  type Player,
  type StoryCard,
  type Votes,
} from './gameLogic';

type GameStep =
  | 'theme'
  | 'players'
  | 'entry'
  | 'play'
  | 'result'
  | 'suddenDeath'
  | 'suddenDeathPlay'
  | 'gameOver';

const themes = [
  'first dates',
  'family vacations',
  'school disasters',
  'bad jobs',
  'drugs',
  'high school',
  'cops',
  'weddings',
  'school fights',
  'dating disasters',
  'tattoos',
  'drinking',
  'food',
  'secret talents',
  'celebrity encounters',
  'unexpected injuries',
  'terrible roommates',
  'holiday chaos',
  'near misses',
  'weird dreams',
  'childhood trouble',
  'fashion',
  'toys',
  'gambling',
  'shock',
  'celebrations',
  'crime',
  'nature',
  'luck',
  'loss',
  'fall',
  'sickness',
  'regrets',
  'darkness',
  'sex, drugs, & rock & roll',
  'kids',
  'women',
  'sex',
  'family',
  'school',
  'neighbors',
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
  'Double Points: Stories 5, 6, 7, and 8 are double points.',
];

const maxGameStories = 8;

function App() {
  const [step, setStep] = useState<GameStep>('theme');
  const [theme, setTheme] = useState(themes[0]);
  const [customTheme, setCustomTheme] = useState('');
  const [playerCount, setPlayerCount] = useState(3);
  const [entryIndex, setEntryIndex] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [currentStories, setCurrentStories] = useState(['', '', '', '']);
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<StoryCard[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [votes, setVotes] = useState<Votes>({});
  const [showRules, setShowRules] = useState(false);
  const [wagers, setWagers] = useState<Record<number, number>>({});
  const [suddenDeathStory, setSuddenDeathStory] = useState<StoryCard | undefined>();
  const [suddenDeathRevealed, setSuddenDeathRevealed] = useState(false);
  const [suddenDeathVotes, setSuddenDeathVotes] = useState<Votes>({});

  const currentStory = deck[storyIndex];
  const currentStoryOwner = players.find((player) => player.id === currentStory?.playerId);
  const suddenDeathStoryOwner = players.find((player) => player.id === suddenDeathStory?.playerId);
  const doublePoints = isDoublePointsRound(deck.length, storyIndex);
  const allPlayersGuessed =
    players.length > 0 && players.every((player) => votes[player.id] !== undefined && votes[player.id] !== '');

  const tiedPlayers = useMemo(() => {
    return getTiedPlayers(players);
  }, [players]);
  const finalistIds = useMemo(() => tiedPlayers.map((player) => player.id), [tiedPlayers]);
  const allFinalistsGuessed =
    tiedPlayers.length > 0 &&
    tiedPlayers.every((player) => suddenDeathVotes[player.id] !== undefined && suddenDeathVotes[player.id] !== '');

  const randomTheme = () => {
    const options = themes.filter((item) => item !== theme);
    setTheme(options[Math.floor(Math.random() * options.length)]);
    setCustomTheme('');
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
      setDeck(createDeck(nextPlayers));
      setVotes({});
      setStoryIndex(0);
      setStep('play');
      return;
    }

    setEntryIndex(entryIndex + 1);
  };

  const scoreStory = () => {
    if (!currentStory || !allPlayersGuessed) {
      return;
    }

    const scoredPlayers = scorePlayers(players, currentStory, votes, doublePoints);

    setPlayers(scoredPlayers);
    setVotes({});
    setRevealed(false);
    setStep('result');
  };

  const advanceStory = () => {
    if (storyIndex + 1 >= Math.min(deck.length, maxGameStories)) {
      const highScore = Math.max(...players.map((player) => player.score));
      const tied = players.filter((player) => player.score === highScore);
      const playedCount = Math.min(deck.length, maxGameStories);
      const suddenDeathCandidate = getSuddenDeathStory(
        deck,
        playedCount,
        tied.map((player) => player.id),
      );

      setWagers(Object.fromEntries(tied.map((player) => [player.id, 0])));
      setStep(tied.length > 1 && suddenDeathCandidate ? 'suddenDeath' : 'gameOver');
      return;
    }

    setStoryIndex(storyIndex + 1);
    setStep('play');
  };

  const startSuddenDeathRound = () => {
    const nextStory = getSuddenDeathStory(deck, Math.min(deck.length, maxGameStories), finalistIds);

    if (!nextStory) {
      setStep('gameOver');
      return;
    }

    setSuddenDeathStory(nextStory);
    setSuddenDeathRevealed(false);
    setSuddenDeathVotes({});
    setStep('suddenDeathPlay');
  };

  const finishSuddenDeath = () => {
    if (!suddenDeathStory || !allFinalistsGuessed) {
      return;
    }

    setPlayers(scoreSuddenDeath(players, suddenDeathStory, suddenDeathVotes, wagers, finalistIds));
    setStep('gameOver');
  };

  const startFromScratch = () => {
    setStep('theme');
    setTheme(themes[0]);
    setCustomTheme('');
    setPlayerCount(3);
    setEntryIndex(0);
    setPlayers([]);
    setDeck([]);
    setStoryIndex(0);
    setRevealed(false);
    setVotes({});
    setWagers({});
    setSuddenDeathStory(undefined);
    setSuddenDeathRevealed(false);
    setSuddenDeathVotes({});
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
        <section className="panel theme-panel">
          <h2>Choose a Theme</h2>
          <p>All stories must be about the chosen theme.</p>
          <div className="theme-display">{theme}</div>
          <label className="custom-theme-field">
            Enter your own theme
            <input
              aria-label="Enter your own theme"
              placeholder="example: road trips gone wrong"
              value={customTheme}
              onChange={(event) => {
                const nextTheme = event.target.value;
                setCustomTheme(nextTheme);
                setTheme(nextTheme.trim() || themes[0]);
              }}
            />
          </label>
          <div className="button-row">
            <button className="link-button" type="button" onClick={() => setShowRules(true)}>
          Rules
            </button>
            <button type="button" onClick={randomTheme}>
              Random Theme
            </button>
            <button type="button" onClick={() => setStep('players')}>
              ARE YOU READY FOR WAR?
            </button>
          </div>
        </section>
      )}

      {step === 'players' && (
        <section className="panel">
          <h2>Select Number of Players</h2>
          <div className="segmented" aria-label="Select Number of Players">
            {[4, 5, 6, 7].map((count) => (
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
              Story number {storyIndex + 1}
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
                      {players
                        .filter((option) => option.id !== player.id)
                        .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                        ))}
                    </select>
                  </label>
                ))}
              </div>
              <button type="button" onClick={scoreStory} disabled={!allPlayersGuessed}>
                Whose story is this?
              </button>
            </>
          )}
        </section>
      )}

      {step === 'result' && currentStory && currentStoryOwner && (
        <section className="panel result-panel">
          <h2>
            Story number {storyIndex + 1} belonged to: {currentStoryOwner.name}
          </h2>
          <div className="scoreboard final" aria-label="Updated scoreboard">
            {players
              .toSorted((a, b) => b.score - a.score)
              .map((player) => (
                <div key={player.id}>
                  <span>{player.name}</span>
                  <strong>{player.score}</strong>
                </div>
              ))}
          </div>
          <button type="button" onClick={advanceStory}>
            {storyIndex + 1 >= Math.min(deck.length, maxGameStories)
              ? 'Final scores'
              : `Story number ${storyIndex + 2}`}
          </button>
        </section>
      )}

      {step === 'suddenDeath' && (
        <section className="panel">
          <h2>Sudden Death!</h2>
          <p>Tied players must wager between 0 and all of their current points.</p>
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
                      [player.id]: clampWager(player.score, Number(event.target.value)),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={startSuddenDeathRound}>
            Start Sudden Death Round
          </button>
        </section>
      )}

      {step === 'suddenDeathPlay' && suddenDeathStory && (
        <section className="panel play-panel">
          <div className="story-meta">
            <h2>Sudden Death Story</h2>
          </div>
          <article className="story-card">{suddenDeathRevealed ? suddenDeathStory.text : 'Ready?'}</article>

          {!suddenDeathRevealed ? (
            <button type="button" onClick={() => setSuddenDeathRevealed(true)}>
              Reveal sudden death story
            </button>
          ) : (
            <>
              <div className="votes">
                {tiedPlayers.map((player) => (
                  <label key={player.id}>
                    {player.name}'s guess
                    <select
                      value={suddenDeathVotes[player.id] ?? ''}
                      onChange={(event) =>
                        setSuddenDeathVotes({
                          ...suddenDeathVotes,
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
              {suddenDeathStoryOwner && <p>Lock in the finalists' guesses before revealing final scores.</p>}
              <button type="button" onClick={finishSuddenDeath} disabled={!allFinalistsGuessed}>
                Final scores
              </button>
            </>
          )}
        </section>
      )}

      {step === 'gameOver' && (
        <section className="panel">
          <h2>Final Scores</h2>
          {suddenDeathStoryOwner && <p>Sudden death story belonged to: {suddenDeathStoryOwner.name}</p>}
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
          <h2>Scoreboard</h2>
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
            <p>
              The story: A random unplayed story written by a non-tied player is revealed when
              possible.
            </p>
            <p>Voting: Only tied players vote, and any player can be guessed.</p>
            <p>
              Scoring: Each tied player adds their wager for a correct guess or loses their wager
              for a miss. Highest score wins. No double points in sudden death.
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

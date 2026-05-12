export type Player = {
  id: number;
  name: string;
  stories: string[];
  score: number;
};

export type StoryCard = {
  playerId: number;
  text: string;
};

export type Votes = Record<number, number | ''>;

export function shuffle<T>(items: T[], random = Math.random) {
  return [...items].sort(() => random() - 0.5);
}

export function createDeck(players: Player[], random = Math.random): StoryCard[] {
  return shuffle(
    players.flatMap((player) =>
      player.stories.map((story) => ({
        playerId: player.id,
        text: story,
      })),
    ),
    random,
  );
}

export function isDoublePointsRound(deckLength: number, storyIndex: number) {
  const storyNumber = storyIndex + 1;
  return deckLength > 0 && storyNumber >= 5 && storyNumber <= 8 && storyIndex < deckLength;
}

export function scorePlayers(
  players: Player[],
  currentStory: StoryCard,
  votes: Votes,
  doublePoints: boolean,
) {
  const multiplier = doublePoints ? 2 : 1;

  return players.map((player) => {
    let earned = 0;

    Object.entries(votes).forEach(([voterId, guessedId]) => {
      const voter = Number(voterId);

      if (guessedId === '' || guessedId === voter) {
        return;
      }

      if (guessedId === currentStory.playerId && voter !== currentStory.playerId) {
        earned += player.id === voter ? 2 : 0;
      }

      if (voter !== currentStory.playerId && guessedId !== currentStory.playerId) {
        earned += player.id === currentStory.playerId ? 1 : 0;
      }
    });

    return { ...player, score: player.score + earned * multiplier };
  });
}

export function getTiedPlayers(players: Player[]) {
  if (players.length === 0) {
    return [];
  }

  const highScore = Math.max(...players.map((player) => player.score));
  return players.filter((player) => player.score === highScore);
}

export function clampWager(score: number, wager: number) {
  return Math.min(score, Math.max(0, wager));
}

export function getSuddenDeathStory(deck: StoryCard[], playedCount: number, finalistIds: number[]) {
  const unplayedStories = deck.slice(playedCount);
  const finalistIdSet = new Set(finalistIds);

  return unplayedStories.find((story) => !finalistIdSet.has(story.playerId)) ?? unplayedStories[0];
}

export function scoreSuddenDeath(
  players: Player[],
  currentStory: StoryCard,
  votes: Votes,
  wagers: Record<number, number>,
  finalistIds: number[],
) {
  const finalistIdSet = new Set(finalistIds);

  return players.map((player) => {
    if (!finalistIdSet.has(player.id)) {
      return player;
    }

    const wager = clampWager(player.score, wagers[player.id] || 0);
    const guessedCorrectly = votes[player.id] === currentStory.playerId;

    return {
      ...player,
      score: player.score + (guessedCorrectly ? wager : -wager),
    };
  });
}

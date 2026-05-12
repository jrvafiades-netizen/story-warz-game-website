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
  return deckLength > 0 && storyIndex >= Math.floor(deckLength / 2);
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

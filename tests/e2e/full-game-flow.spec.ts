import { expect, test, type Locator } from '@playwright/test';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const playerCount = 4;
const storyCount = 4;
const maxGameStories = 8;
const appBasePath = '/story-warz-game-website/';
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const gameRunPath = path.resolve(distDir, '../test-results/full-game-flow.json');

let appServer: Server;
let appUrl: string;

type ScoreSnapshot = Array<{ player: string; score: number }>;

type GameRun = {
  rounds: Array<{
    round: number;
    story: string;
    owner: string;
    guesses: Record<string, string>;
    scores: ScoreSnapshot;
  }>;
  suddenDeath?: {
    story: string;
    owner: string;
    wagers: Record<string, number>;
    guesses: Record<string, string>;
    scores: ScoreSnapshot;
  };
  finalScores?: ScoreSnapshot;
};

test.beforeAll(async () => {
  appServer = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = requestUrl.pathname.startsWith(appBasePath)
      ? requestUrl.pathname.slice(appBasePath.length - 1)
      : requestUrl.pathname;
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = path.resolve(distDir, relativePath);

    if (!filePath.startsWith(distDir)) {
      response.writeHead(403).end();
      return;
    }

    try {
      const fileStats = await stat(filePath);

      if (!fileStats.isFile()) {
        response.writeHead(404).end();
        return;
      }

      response.setHeader('Content-Type', contentType(filePath));
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise<void>((resolve) => {
    appServer.listen(0, '127.0.0.1', resolve);
  });

  const address = appServer.address();

  if (typeof address !== 'object' || address === null) {
    throw new Error('Expected the test server to listen on a TCP port.');
  }

  appUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    appServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

function contentType(filePath: string) {
  const extension = path.extname(filePath);

  if (extension === '.html') {
    return 'text/html; charset=utf-8';
  }

  if (extension === '.js') {
    return 'text/javascript; charset=utf-8';
  }

  if (extension === '.css') {
    return 'text/css; charset=utf-8';
  }

  if (extension === '.svg') {
    return 'image/svg+xml';
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  return 'application/octet-stream';
}

function regularRoundGuess(storyNumber: number, ownerNumber: number, voterNumber: number) {
  if (ownerNumber === 1) {
    if (voterNumber === 1) {
      return 'p2';
    }

    if (voterNumber === 2) {
      return 'p1';
    }

    const shouldMiss = voterNumber === 3 ? storyNumber % 2 === 1 : storyNumber % 2 === 0;
    return shouldMiss ? 'p2' : 'p1';
  }

  if (ownerNumber === 2) {
    if (voterNumber === 2) {
      return 'p1';
    }

    if (voterNumber === 1) {
      return 'p2';
    }

    const shouldHit = (voterNumber === 3 && storyNumber === 5) || (voterNumber === 4 && storyNumber === 6);
    return shouldHit ? 'p2' : 'p1';
  }

  return `p${ownerNumber}`;
}

test('plays a full game flow with named players and stories', async ({ page }) => {
  const gameRun: GameRun = {
    rounds: [],
  };

  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });

  await page.goto(appUrl);

  await page.getByRole('button', { name: 'ARE YOU READY FOR WAR?' }).click();
  await page.getByRole('button', { name: '4 Players' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  for (let playerNumber = 1; playerNumber <= playerCount; playerNumber += 1) {
    await expect(page.getByRole('heading', { name: `Player ${playerNumber}, Enter Your Name` })).toBeVisible();
    await page.getByLabel('Your Name').fill(`p${playerNumber}`);

    for (let storyNumber = 1; storyNumber <= storyCount; storyNumber += 1) {
      await page.getByLabel(`Story ${storyNumber}`).fill(`p${playerNumber}s${storyNumber}`);
    }

    await page.getByRole('button', { name: 'Submit' }).click();
  }

  for (let storyNumber = 1; storyNumber <= maxGameStories; storyNumber += 1) {
    await expect(page.getByRole('heading', { name: `Story ${storyNumber}` })).toBeVisible();
    await page.getByRole('button', { name: `Story number ${storyNumber}` }).click();

    const storyText = await page.locator('.story-card').innerText();
    const owner = storyText.match(/^p(?<playerNumber>\d+)s\d+$/)?.groups?.playerNumber;
    expect(owner, `Expected story text "${storyText}" to identify a player`).toBeTruthy();

    const nextStoryButton = page.getByRole('button', { name: 'Whose story is this?' });
    await expect(nextStoryButton).toBeDisabled();

    const guesses: Record<string, string> = {};

    for (let voterNumber = 1; voterNumber <= playerCount; voterNumber += 1) {
      await expect(page.getByLabel(`p${voterNumber}'s guess`).locator('option', { hasText: `p${voterNumber}` })).toHaveCount(0);

      const guess = regularRoundGuess(storyNumber, Number(owner), voterNumber);
      guesses[`p${voterNumber}`] = guess;
      await page.getByLabel(`p${voterNumber}'s guess`).selectOption({ label: guess });
    }

    await expect(nextStoryButton).toBeEnabled();
    await nextStoryButton.click();

    await expect(
      page.getByRole('heading', {
        name: `Story number ${storyNumber} belonged to: p${owner}`,
      }),
    ).toBeVisible();
    await expect(page.getByLabel('Updated scoreboard').getByText(`p${owner}`, { exact: true })).toBeVisible();

    const scores = await readScores(page.getByLabel('Updated scoreboard'));

    gameRun.rounds.push({
      round: storyNumber,
      story: storyText,
      owner: `p${owner}`,
      guesses,
      scores,
    });

    if (storyNumber < maxGameStories) {
      await page.getByRole('button', { name: `Story number ${storyNumber + 1}` }).click();
    } else {
      await page.getByRole('button', { name: 'Final scores' }).click();
    }
  }

  await expect(page.getByRole('heading', { name: 'Story 9' })).toHaveCount(0);

  if (await page.getByRole('heading', { name: 'Sudden Death!' }).isVisible()) {
    const suddenDeath = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Sudden Death!' }),
    });
    const wagerLabels = suddenDeath.locator('label');
    const wagerFields = suddenDeath.locator('input[type="number"]');
    const suddenDeathWagers: Record<string, number> = {};

    for (let index = 0; index < await wagerFields.count(); index += 1) {
      const labelText = await wagerLabels.nth(index).textContent();
      const finalistName = labelText?.match(/^(p\d+)'s wager/)?.[1];
      expect(finalistName, `Expected sudden death wager label "${labelText}" to identify a finalist`).toBeTruthy();
      const wager = '1';
      suddenDeathWagers[finalistName] = Number(wager);
      await wagerFields.nth(index).fill(wager);
    }

    await suddenDeath.getByRole('button', { name: 'Start Sudden Death Round' }).click();

    await expect(page.getByRole('heading', { name: 'Sudden Death Story' })).toBeVisible();
    await page.getByRole('button', { name: 'Reveal sudden death story' }).click();

    const suddenDeathStoryText = await page.locator('.story-card').innerText();
    const suddenDeathOwner = suddenDeathStoryText.match(/^p(?<playerNumber>\d+)s\d+$/)?.groups?.playerNumber;
    expect(suddenDeathOwner, `Expected story text "${suddenDeathStoryText}" to identify a player`).toBeTruthy();
    expect(Object.keys(suddenDeathWagers)).not.toContain(`p${suddenDeathOwner}`);

    const finalScoresButton = page.getByRole('button', { name: 'Final scores' });
    await expect(finalScoresButton).toBeDisabled();

    const suddenDeathGuessFields = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Sudden Death Story' }),
    });

    const suddenDeathLabels = suddenDeathGuessFields.locator('label');
    const suddenDeathGuesses: Record<string, string> = {};

    for (let index = 0; index < await suddenDeathLabels.count(); index += 1) {
      const labelText = await suddenDeathLabels.nth(index).textContent();
      const finalistName = labelText?.match(/^(p\d+)'s guess/)?.[1];
      expect(finalistName, `Expected sudden death guess label "${labelText}" to identify a finalist`).toBeTruthy();
      const miss = suddenDeathOwner === '4' ? 'p3' : 'p4';
      const guess = index === 0 ? `p${suddenDeathOwner}` : miss;
      suddenDeathGuesses[finalistName] = guess;
      await page.getByLabel(`${finalistName}'s guess`).selectOption({ label: guess });
    }

    await expect(finalScoresButton).toBeEnabled();
    await finalScoresButton.click();

    gameRun.suddenDeath = {
      story: suddenDeathStoryText,
      owner: `p${suddenDeathOwner}`,
      wagers: suddenDeathWagers,
      guesses: suddenDeathGuesses,
      scores: await readScores(page.locator('.scoreboard.final')),
    };
  }

  const finalScores = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Final Scores' }),
  });

  await expect(finalScores).toBeVisible();
  await expect(finalScores.getByText('p1', { exact: true })).toBeVisible();
  await expect(finalScores.getByText('p2', { exact: true })).toBeVisible();
  await expect(finalScores.getByText('p3', { exact: true })).toBeVisible();
  await expect(finalScores.getByText('p4', { exact: true })).toBeVisible();
  await expect(finalScores.getByRole('button', { name: 'Start from scratch' })).toBeVisible();

  gameRun.finalScores = await readScores(finalScores.locator('.scoreboard.final'));
  await mkdir(path.dirname(gameRunPath), { recursive: true });
  await writeFile(gameRunPath, JSON.stringify(gameRun, null, 2));
});

async function readScores(scoreboard: Locator) {
  return scoreboard.locator(':scope > div').evaluateAll((rows) =>
    rows.map((row) => {
      const [player, score] = Array.from(row.children).map((child) => child.textContent?.trim() ?? '');

      return {
        player,
        score: Number(score),
      };
    }),
  );
}

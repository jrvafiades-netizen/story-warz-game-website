# AI Bug Analysis + Test Suggestions

You are running after:

1. Unit Tests
2. Deterministic Playwright E2E
3. Agentic Playwright CLI Exploration

Analyze the checked-out source plus these CI artifacts when present:

```text
test-results/deterministic-playwright-e2e/
test-results/agentic-playwright-cli-exploration/
```

Produce a concise Markdown report for the CI job summary. Do not modify source files.

Prioritize:

- real product bugs or likely regressions
- missing deterministic unit or Playwright coverage
- flaky-test risks
- accessibility or UX issues discovered during exploration

Use this output shape:

- Summary
- Bugs or Risks
- Suggested Unit Tests
- Suggested Playwright E2E Tests
- Follow-Up Priority

import { test, expect } from '@playwright/test'

// Exact SSE wire format the client expects: `data: <json>\n\n` per frame.
const SSE_BODY = [
  `data: ${JSON.stringify({ type: 'thinking', text: 'Looking at your map — the Research branch looks thin.' })}`,
  '',
  `data: ${JSON.stringify({ type: 'suggestion', action: { kind: 'add_node', label: 'Pricing model', parentId: 'root' } })}`,
  '',
  `data: ${JSON.stringify({ type: 'done', latencyMs: 1200, tokens: 320, costUsd: 0.0002, truncated: false })}`,
  '',
  '',
].join('\n')

test.beforeEach(async ({ page }) => {
  // Pre-select an agent so the first-run picker doesn't gate analysis.
  await page.addInitScript(() => localStorage.setItem('nf:agent:id', 'axiom9'))
  // Never hit the real LLM — intercept the SSE endpoint with a canned stream.
  await page.route('**/api/ai/analyze', (route) =>
    route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: SSE_BODY }),
  )
})

test('analyze (mocked) → stream → apply suggestion adds a node', async ({ page }) => {
  await page.goto('/')

  // SPA: wait for the seed board to render.
  await expect(page.locator('text=central idea').first()).toBeVisible()

  // The proposed node is not on the canvas yet.
  const canvasNode = page.locator('svg text.node-text', { hasText: 'Pricing model' })
  await expect(canvasNode).toHaveCount(0)

  // Open the AI panel, then run the analysis from inside it.
  await page.getByRole('button', { name: 'Ask AI to analyze map' }).click()
  await page.getByRole('button', { name: /analyze my map/ }).click()

  // Streamed reasoning shows up in the panel.
  await expect(page.locator('text=Looking at your map').first()).toBeVisible()

  // Suggestion card renders with an apply button.
  const applyBtn = page.getByRole('button', { name: 'apply', exact: true })
  await expect(applyBtn).toBeVisible()
  await applyBtn.click()

  // After apply, the new node is drawn on the canvas.
  await expect(canvasNode).toHaveCount(1)
})

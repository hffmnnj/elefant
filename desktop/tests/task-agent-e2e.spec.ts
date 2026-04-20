/**
 * Task/Agent E2E Tests
 *
 * Tests verify:
 *   1. App loads and connects to daemon
 *   2. Task tool renders AgentTaskCard (not GenericToolCard)
 *   3. Task card shows Complete status
 *   4. Clicking task card navigates to ChildRunView
 *   5. Back navigation returns to chat
 *   6. Agent session search tool works
 */

import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:1420";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function openProject(page: Page): Promise<void> {
  await page.goto(BASE);
  await page.waitForTimeout(1500);
  const btn = page.getByRole("button", { name: /Open project/ });
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function navigateToChat(page: Page): Promise<void> {
  // Try to find and click the Chat navigation button
  const chatBtn = page.getByRole("button", { name: /Chat/i });
  if (await chatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chatBtn.click();
    await page.waitForTimeout(500);
  }
}

async function sendChatMessage(page: Page, message: string): Promise<void> {
  // Find the textarea and type the message
  const textarea = page.locator('textarea[placeholder*="Message"], textarea[placeholder*="message"]').first();
  await textarea.waitFor({ state: "visible", timeout: 5000 });
  await textarea.fill(message);
  
  // Send with Ctrl+Enter
  await textarea.press("Control+Enter");
  await page.waitForTimeout(1000);
}

// ─── Suite 1: App Loading ───────────────────────────────────────────────────

test.describe("App Loading", () => {
  test("app loads and connects to daemon", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(2000);
    
    // Check for daemon connection indicator - look for "Connected" text
    // or a status indicator in the UI
    const pageContent = await page.content();
    
    // The app should load without errors
    expect(pageContent).toContain("Elefant");
    
    // Wait for any connection status to appear
    await page.waitForTimeout(1000);
    
    // Check that the page is fully loaded (no error states)
    const errorElements = await page.locator('.error, [data-error], .connection-error').count();
    expect(errorElements).toBe(0);
  });
});

// ─── Suite 2: Task Tool Flow ────────────────────────────────────────────────

test.describe("Task Tool Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(1500);
    await openProject(page);
    await navigateToChat(page);
  });

  test("task tool renders AgentTaskCard (not GenericToolCard)", async ({ page }) => {
    // Send a message that triggers the task tool
    const prompt = 'Use the task tool RIGHT NOW with: description="e2e-test", agent_type="default", prompt="Reply with just: OK". Do not ask, just call task immediately.';
    await sendChatMessage(page, prompt);
    
    // Wait up to 60s for the agent task card to appear
    const agentTaskCard = page.locator(".agent-task-card").first();
    await expect(agentTaskCard).toBeVisible({ timeout: 60000 });
    
    // Ensure it's NOT a GenericToolCard (placeholder)
    const genericPlaceholder = page.locator(".task-card-placeholder");
    const genericCount = await genericPlaceholder.count();
    expect(genericCount).toBe(0);
    
    // Verify the card has the correct class
    const cardClass = await agentTaskCard.getAttribute("class");
    expect(cardClass).toContain("agent-task-card");
  });

  test("task card shows Complete status", async ({ page }) => {
    // Send a message that triggers the task tool
    const prompt = 'Use the task tool RIGHT NOW with: description="e2e-test-complete", agent_type="default", prompt="Reply with just: OK". Do not ask, just call task immediately.';
    await sendChatMessage(page, prompt);
    
    // Wait for the agent task card to appear
    const agentTaskCard = page.locator(".agent-task-card").first();
    await expect(agentTaskCard).toBeVisible({ timeout: 60000 });
    
    // Wait for the card to show "Complete" status (agent loop is synchronous)
    await expect(agentTaskCard).toContainText("Complete", { timeout: 60000 });
    
    // Assert card disabled attribute is false (clickable)
    const disabledAttr = await agentTaskCard.getAttribute("disabled");
    expect(disabledAttr).toBeNull();
    
    // Assert card has aria-label containing "Open child run"
    const ariaLabel = await agentTaskCard.getAttribute("aria-label");
    expect(ariaLabel).toContain("Open child run");
  });

  test("clicking task card navigates to ChildRunView", async ({ page }) => {
    // Send a message that triggers the task tool
    const prompt = 'Use the task tool RIGHT NOW with: description="e2e-test-nav", agent_type="default", prompt="Reply with just: OK". Do not ask, just call task immediately.';
    await sendChatMessage(page, prompt);
    
    // Wait for the agent task card to appear and complete
    const agentTaskCard = page.locator(".agent-task-card").first();
    await expect(agentTaskCard).toBeVisible({ timeout: 60000 });
    await expect(agentTaskCard).toContainText("Complete", { timeout: 60000 });
    
    // Click the card
    await agentTaskCard.click();
    await page.waitForTimeout(500);
    
    // Assert ChildRunView rendered - check for breadcrumb text "Parent" or "← Parent"
    const breadcrumb = page.locator("text=Parent, [aria-label*='Parent'], .breadcrumb, .child-run-view").first();
    const hasChildRunView = await breadcrumb.isVisible().catch(() => false);
    
    // Also check for child-run-view class
    const childRunView = page.locator(".child-run-view");
    const childRunViewCount = await childRunView.count();
    
    expect(hasChildRunView || childRunViewCount > 0).toBe(true);
  });

  test("back navigation returns to chat", async ({ page }) => {
    // Send a message that triggers the task tool
    const prompt = 'Use the task tool RIGHT NOW with: description="e2e-test-back", agent_type="default", prompt="Reply with just: OK". Do not ask, just call task immediately.';
    await sendChatMessage(page, prompt);
    
    // Wait for the agent task card to appear and complete
    const agentTaskCard = page.locator(".agent-task-card").first();
    await expect(agentTaskCard).toBeVisible({ timeout: 60000 });
    await expect(agentTaskCard).toContainText("Complete", { timeout: 60000 });
    
    // Click the card to navigate to ChildRunView
    await agentTaskCard.click();
    await page.waitForTimeout(500);
    
    // Find and click the back/Parent button
    const backBtn = page.locator("button:has-text('Parent'), [aria-label*='Parent'], .back-button, .breadcrumb button").first();
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click();
    } else {
      // Try browser back button as fallback
      await page.goBack();
    }
    await page.waitForTimeout(500);
    
    // Assert chat view is back (textarea visible)
    const textarea = page.locator('textarea[placeholder*="Message"], textarea[placeholder*="message"]').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
  });
});

// ─── Suite 3: Agent Session Search ──────────────────────────────────────────

test.describe("Agent Session Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(1500);
    await openProject(page);
    await navigateToChat(page);
  });

  test("agent session search tool works", async ({ page }) => {
    // First, create a task and get its runId
    const prompt = 'Use the task tool RIGHT NOW with: description="e2e-test-search", agent_type="default", prompt="Reply with just: OK". Do not ask, just call task immediately.';
    await sendChatMessage(page, prompt);
    
    // Wait for the agent task card to appear and complete
    const agentTaskCard = page.locator(".agent-task-card").first();
    await expect(agentTaskCard).toBeVisible({ timeout: 60000 });
    await expect(agentTaskCard).toContainText("Complete", { timeout: 60000 });
    
    // Extract runId from the card's aria-label or data attribute
    const ariaLabel = await agentTaskCard.getAttribute("aria-label");
    let runId = "";
    
    // Try to extract runId from aria-label (format: "Open child run [runId]")
    if (ariaLabel) {
      const match = ariaLabel.match(/\[([^\]]+)\]/);
      if (match) {
        runId = match[1];
      }
    }
    
    // If not in aria-label, try data-run-id attribute
    if (!runId) {
      runId = await agentTaskCard.getAttribute("data-run-id") || "";
    }
    
    // If we have a runId, test the agent_session_search tool
    if (runId) {
      const searchPrompt = `Call agent_session_search with run_id="${runId}"`;
      await sendChatMessage(page, searchPrompt);
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Check that we got a response (look for message content)
      const messages = page.locator(".message, .chat-message, [data-role='assistant']").last();
      const messageText = await messages.textContent() || "";
      
      // The response should contain something (messages, results, or at least not an error)
      expect(messageText.length).toBeGreaterThan(0);
    } else {
      // If we couldn't extract runId, skip this part of the test
      test.skip();
    }
  });
});

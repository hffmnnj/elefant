# Smoke Test Guide

This document provides manual smoke test paths for each Must-Have (MH) feature in the Daemon & Desktop QoL Sprint.

## Prerequisites

1. Start the daemon: `bun run dev` or `bun run start`
2. Start the desktop: `cd desktop && bun run dev`
3. Ensure you have at least one project configured

---

## MH1: `permission:ask` Hook Veto Semantics

**Test Path:**

1. Create a test plugin at `~/.elefant/plugins/test-permission/index.ts`:
   ```ts
   export default function plugin(api) {
     api.on('permission:ask', (ctx) => {
       if (ctx.tool === 'bash') {
         console.log('Permission asked for bash:', ctx);
         return { status: 'deny', reason: 'Test veto' };
       }
     });
   }
   ```

2. Restart the daemon to load the plugin

3. Open the desktop app and start a chat session

4. Ask the agent to run a bash command (e.g., "list files in current directory")

5. **Expected:** The bash tool call should be denied immediately without showing an approval prompt. Check the daemon logs for the permission hook log.

6. Remove the test plugin and restart

---

## MH2: `system:transform` Context Injection

**Test Path:**

1. Create a test plugin at `~/.elefant/plugins/test-transform/index.ts`:
   ```ts
   export default function plugin(api) {
     api.on('system:transform', (ctx) => {
       console.log('Transform fired for session:', ctx.sessionId);
       console.log('Message count:', ctx.messages.length);
       console.log('Token budget:', ctx.budgets.tokens);
       return { messages: ctx.messages };
     });
   }
   ```

2. Restart the daemon

3. Open the desktop app and send any message

4. **Expected:** Check daemon logs - you should see "Transform fired" messages for each provider call. The messages should not be persisted to the conversation history (check the DB or refresh the page to verify).

5. Remove the test plugin

---

## MH3: Sub-Agent Runs with Async Execution

**Test Path:**

1. Open the desktop app and select a project

2. Click the "Runs" item in the sidebar (or navigate to agent-runs view)

3. The AgentRunTabs component should load (may be empty initially)

4. To test spawning a run manually, use curl:
   ```bash
   curl -X POST http://localhost:3001/api/projects/:projectId/sessions/:sessionId/agent-runs \
     -H "Content-Type: application/json" \
     -d '{"agentType":"test","title":"Smoke Test Run","prompt":"Say hello"}'
   ```

5. **Expected:** 
   - Returns `{ ok: true, data: { runId: "..." } }`
   - The run appears in the AgentRunTabs view
   - SSE events stream to the desktop (check Network tab for EventSource connection)
   - The run completes with status "done"

6. Test cancel by clicking the cancel button on a running run, or:
   ```bash
   curl -X POST http://localhost:3001/api/agent-runs/:runId/cancel
   ```

---

## MH4: Agent Configuration & Limits

**Test Path:**

1. Open the desktop app

2. Click "Agent Config" in the sidebar

3. **Expected:** AgentProfilesView loads showing default profiles (planner, executor, researcher, default)

4. Click on a profile card to expand it

5. **Expected:** AgentProfileCard shows effective values with layer attribution badges (Global/Project)

6. Click "Edit" on a profile

7. **Expected:** AgentLimitsForm and ToolPolicyEditor render with current values

8. Modify a value (e.g., change maxIterations) and save

9. **Expected:** 
   - Save succeeds
   - Value persists on reload
   - Layer badge shows "Project" for overridden values

10. Open the chat composer and click the "Override" button

11. **Expected:** AgentOverrideDialog opens with form fields

12. Set an override value and send a message

13. **Expected:** The override is passed to the daemon (check Network tab for POST /api/chat payload)

---

## MH5: Git Worktree Management

**Test Path:**

1. Open the desktop app and select a project that is a git repository

2. Click "Worktrees" in the sidebar

3. **Expected:** WorktreeListPanel loads showing current worktrees (or empty state)

4. Click "Create Worktree" button

5. Fill in target path (e.g., `../my-project-feature-branch`) and branch name

6. **Expected:** 
   - Create succeeds
   - New worktree appears in the list
   - Status shows as "clean" or "dirty" based on git status

7. Click "Open Terminal" on a worktree row

8. **Expected:** Terminal opens at the worktree path (platform-dependent: Terminal.app on macOS, xdg-terminal on Linux)

9. Click "Reveal in File Manager"

10. **Expected:** File manager opens at the worktree path

11. Click "Delete" on a worktree

12. **Expected:** Delete succeeds, worktree removed from list

---

## MH6: Markdown Rendering

**Test Path:**

1. Open the desktop app and start a chat

2. Ask the agent to generate markdown content, e.g.:
   - "Create a markdown table comparing TypeScript and JavaScript"
   - "Write a code example in Python with syntax highlighting"
   - "Create a bulleted list and a numbered list"

3. **Expected:** 
   - Tables render with proper borders
   - Code blocks show Shiki syntax highlighting
   - Lists render with proper indentation
   - Bold and italic text renders correctly

4. Test streaming safety:
   - Ask for a long code block
   - **Expected:** During streaming, incomplete code fences render as plain text, then switch to highlighted code when closed

5. Test security:
   - Try to get the agent to output: `[click me](javascript:alert('xss'))`
   - **Expected:** Link renders as plain text or with `javascript:` removed, no alert popup

---

## Full Integration Test

**End-to-End Path:**

1. Start with a fresh project
2. Configure an agent profile with specific limits
3. Spawn a sub-agent run with that profile
4. The run should use the configured limits
5. The run events should stream to the desktop UI
6. Permission hooks should fire if tool calls are made
7. System transform hooks should fire for each iteration
8. Any markdown output should render correctly
9. Worktrees should be manageable from the sidebar

---

## Troubleshooting

### Daemon not responding
- Check daemon logs: `tail -f ~/.config/elefant/daemon.log`
- Verify port: `curl http://localhost:3001/health`

### Desktop not connecting
- Check browser console for CORS errors
- Verify daemon URL in settings matches actual daemon port

### Hooks not firing
- Verify plugin is in correct directory (`~/.elefant/plugins/` or project `.elefant/plugins/`)
- Check daemon logs for plugin load messages
- Ensure plugin exports a default function

### Routes returning 404
- Verify routes are mounted in `src/server/app.ts`
- Check that path parameters match (e.g., `:id` vs `:projectId`)


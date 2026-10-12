# ChatSweep: AI Chat Cleaner Chrome Extension

A privacy-first, safety-focused Chrome Extension (Manifest V3) that helps users identify, organize, and clean up low-value or disposable conversations across AI platforms (ChatGPT, Google Gemini, and Anthropic Claude).

---

## Features

- **Multi-Platform Adapters**:
  - **ChatGPT** (`chatgpt.com`): Full discovery and DOM-level actions with deletion verification.
  - **Google Gemini** (`gemini.google.com`): Discovery and deletion. (Archive honestly disabled as unsupported by Gemini).
  - **Anthropic Claude** (`claude.ai`): Discovery and deletion support.
- **Safety First Architecture**:
  - **Dry-Run by Default**: All bulk operations simulate changes and verify DOM selectors before applying any destructive actions.
  - **Batch Ceilings & Rate Limiting**: Enforces configurable maximum batch sizes (default 10) and execution delays between actions to prevent spamming or platform rate limits.
  - **Immunity & Protection Filters**: Sensitive conversations matching custom keywords (`taxes`, `legal`, `confidential`, etc.) or regex patterns (`^\[work\].*`) are strictly protected from cleanup.
  - **User Overrides**: Explicit manual user decisions override heuristic suggestions.
- **Privacy Guaranteed**:
  - Zero external network dependencies.
  - Runs completely on-device using heuristic classifiers.
  - No prompt or chat content is transmitted to third-party APIs.
- **Modern UI**:
  - **Quick Action Popup**: View connected platforms, run discovery scans, and check quick metrics.
  - **Full Dashboard**: Search, filter, bulk select, review suggestions, manage protected rules, and view audit history.

---

## Installation & Development

### 1. Prerequisites
- Node.js (v18+)
- Google Chrome or any Chromium-based browser

### 2. Build the Extension
```bash
npm install
npm run build
```
This compiles the extension files into the `dist/` directory.

### 3. Load in Google Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the `dist/` folder inside this project directory (`c:/Projects/AI Chat Cleaner/dist`).
5. Pin **ChatSweep** from the Chrome extensions toolbar.

---

## Testing & Quality Checks

- **Run Unit Tests (Vitest)**:
  ```bash
  npm test
  ```
  Runs the full suite of unit tests covering rule classifications, safe batch executors, storage schema migrations, and DOM adapter fixtures.

- **Run Type Check (TypeScript)**:
  ```bash
  npm run typecheck
  ```
  Validates strict type-checking across all source and test files.

- **Build Output Verification**:
  ```bash
  npm run build
  ```
  Bundles the popup, dashboard, background service worker, and content scripts.

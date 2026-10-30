# Chrome Web Store submission

Copy for each field in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), in the order the dashboard asks for it. Images are in `store/assets/`.

---

## Package

Upload `release/chatsweep-<version>.zip`, created by:

```bash
npm run package
```

Bump `version` in both `package.json` and `public/manifest.json` before every resubmission or update. The store rejects a version it has already seen.

---

## Store listing tab

**Name**
ChatSweep - AI Chat Cleaner

**Summary** (132 characters max)
Find and delete throwaway chats in ChatGPT, Gemini and Claude. Explainable rules, dry runs first, and nothing leaves your browser.

**Description**

```
Your AI chat history fills up with test prompts, one-word questions and chats you abandoned halfway. ChatSweep finds them so you can clear them out without scrolling through hundreds of conversations.

HOW IT WORKS
1. Open ChatGPT, Gemini or Claude and click Scan in the ChatSweep popup.
2. ChatSweep reads the conversation titles in the sidebar and sorts them into Keep, Needs review and Cleanup, with a plain-English reason for each.
3. Review the suggestions, select what you want gone, and run a dry run to check it.
4. Turn off dry run and delete. ChatSweep opens each chat's menu, confirms the delete, and checks the chat is really gone.

BUILT TO BE SAFE
- Dry run is on by default. Nothing is deleted until you switch it off yourself.
- Protect chats by keyword (taxes, legal, client...), by pattern, or one at a time. Protected chats are never touched.
- Batches are capped (10 by default) and paced, and stop at the first problem.
- Every action is logged so you can see exactly what happened.

PRIVATE BY DESIGN
- Runs entirely in your browser. No account, no servers, no analytics.
- Reads conversation titles only, never the messages inside them.
- Only works on chatgpt.com, gemini.google.com and claude.ai.

SUPPORTED
- ChatGPT: delete and archive
- Google Gemini: delete
- Anthropic Claude: delete

ChatSweep is an independent tool and is not affiliated with OpenAI, Google or Anthropic.
```

**Category**
Productivity (Workflow & Planning)

**Language**
English

**Graphic assets** (`store/assets/`)

| Field | File | Size |
|---|---|---|
| Store icon | `public/icons/icon128.png` | 128×128 |
| Screenshot 1 | `screenshot-1-overview.png` | 1280×800 |
| Screenshot 2 | `screenshot-2-conversations.png` | 1280×800 |
| Screenshot 3 | `screenshot-3-review.png` | 1280×800 |
| Screenshot 4 | `screenshot-4-dry-run.png` | 1280×800 |
| Screenshot 5 | `screenshot-5-popup.png` | 1280×800 |
| Small promo tile | `promo-small-440x280.png` | 440×280 |
| Marquee promo tile (optional) | `promo-marquee-1400x560.png` | 1400×560 |

The screenshots use made-up sample conversations, not real account data. Regenerate them after UI changes with `npm run store:assets` (needs Chrome installed; set `CHROME_PATH` if it isn't found).

**Official URL / Homepage**
https://github.com/khawajayy/AIChatCleaner

**Support URL**
https://github.com/khawajayy/AIChatCleaner/issues

---

## Privacy tab

**Single purpose**

```
ChatSweep helps users find and delete low-value conversations in their ChatGPT, Google Gemini and Anthropic Claude chat history.
```

**Permission justifications**

`storage`
```
Stores the user's settings, protection rules, scanned conversation titles and an activity log locally on the device with chrome.storage.local. Nothing is sent off the device.
```

`scripting`
```
Content scripts declared in the manifest only run in tabs loaded after installation. If the user already has ChatGPT, Gemini or Claude open, ChatSweep uses scripting.executeScript to inject its own bundled content script (content.js) into that tab so scanning and deleting work without a reload. It never injects remote or dynamically generated code.
```

Host permissions (`https://chatgpt.com/*`, `https://gemini.google.com/*`, `https://claude.ai/*`)
```
ChatSweep's only function is managing conversations on these three sites. It needs access to read the conversation titles in each site's sidebar and to open a conversation's menu and confirm deletion when the user asks it to. It has no access to any other website.
```

**Remote code**
No, I am not using remote code. (All JavaScript is bundled in the package.)

**Data usage**

Data types to check:
- [x] **Website content**: conversation titles read from the sidebars of the three supported sites.

Leave everything else unchecked (personally identifiable information, health, financial, authentication, personal communications, location, web history, user activity).

> Conversation titles are the only user data. Message content is never read, so "Personal communications" does not apply. If a reviewer asks for it anyway, checking it is harmless.

Certifications (check all three):
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**

```
https://khawajayy.github.io/AIChatCleaner/privacy-policy.html
```

This needs GitHub Pages turned on first: repo **Settings → Pages → Deploy from a branch → `main` / `docs`**. Open the URL once to check it loads before submitting.

---

## Distribution tab

- **Visibility:** Public (or Unlisted to test with a few people first)
- **Regions:** All regions

---

## Notes for the reviewer (optional field)

```
To test: sign in to chatgpt.com, gemini.google.com or claude.ai with any account that has a few conversations, open the ChatSweep popup on that tab and click Scan. Open the dashboard to review results. Dry run is on by default, so selecting chats and clicking Delete only simulates the action. To perform a real delete, turn off "Dry run only" in the confirmation dialog and tick the acknowledgement box.
```

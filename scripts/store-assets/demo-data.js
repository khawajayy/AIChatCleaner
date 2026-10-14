// Made-up sample data for store screenshots. Loaded as a classic script by the shot pages,
// which run on the same origin as the built extension pages and share their localStorage.
(function () {
  var now = Date.now();
  var HOUR = 36e5;

  var REASONS = {
    test: 'Cleanup candidate: Obvious test prompt or accidental short query with no sustained dialogue.',
    placeholder: 'Cleanup candidate: Default placeholder title with no substantive follow-up.',
    factual: 'Review: Single factual lookup or unit conversion with no apparent follow-up discussion.',
    duplicate: 'Review: Appears to duplicate 1 other conversation(s) with an identical topic title.',
    keep: 'Keep: Active conversation with no low-value signals detected.',
  };

  var chats = [
    ['c1', 'chatgpt', 'test', 'cleanup', 0.93, [REASONS.test]],
    ['c2', 'chatgpt', 'New chat', 'cleanup', 0.88, [REASONS.placeholder]],
    ['c3', 'chatgpt', 'convert 72F to celsius', 'review', 0.61, [REASONS.factual]],
    ['c4', 'chatgpt', 'Q3 marketing plan outline', 'keep', 0.2, [REASONS.keep]],
    ['c5', 'chatgpt', 'Rewrite cover letter for PM role', 'keep', 0.18, [REASONS.keep]],
    ['c6', 'chatgpt', '[work] API rate limit design', 'keep', 1, ['Protected: Matches user regex pattern "^\\[work\\].*".'], true],
    ['g1', 'gemini', 'asdf', 'cleanup', 0.91, [REASONS.test]],
    ['g2', 'gemini', 'testing 123', 'cleanup', 0.9, [REASONS.test]],
    ['g3', 'gemini', 'Trip itinerary: Lisbon in May', 'keep', 0.15, [REASONS.keep]],
    ['g4', 'gemini', 'how many oz in a cup', 'review', 0.6, [REASONS.factual]],
    ['a1', 'claude', 'hi', 'cleanup', 0.87, [REASONS.test]],
    ['a2', 'claude', 'Refactor auth middleware to async', 'keep', 0.22, [REASONS.keep]],
    ['a3', 'claude', 'Client contract redlines', 'keep', 1, ['Protected: Matches user protected keyword "client".'], true],
    ['a4', 'claude', 'Postgres index tuning', 'review', 0.58, [REASONS.duplicate]],
    ['a5', 'claude', 'Postgres index tuning', 'review', 0.58, [REASONS.duplicate]],
  ].map(function (c, i) {
    var url = { chatgpt: 'https://chatgpt.com/c/', gemini: 'https://gemini.google.com/app/', claude: 'https://claude.ai/chat/' }[c[1]];
    return {
      id: c[0], platform: c[1], title: c[2], url: url + c[0],
      lastActivityTimestamp: null, messageCount: null, isEmpty: c[2] === 'New chat', isUnfinished: false,
      category: c[3], confidence: c[4], reasons: c[5], lastScannedAt: now - i * 60000,
      supportsArchive: c[1] === 'chatgpt', supportsDelete: true, status: 'discovered', isProtected: !!c[6],
    };
  });

  var logs = [
    ['l1', 'claude', 'a6', 'scratch', 'delete', true, 25],
    ['l2', 'chatgpt', 'c7', 'New chat', 'delete', true, 26],
    ['l3', 'chatgpt', 'c8', 'aaa', 'delete', true, 27],
    ['l4', 'chatgpt', 'c7', 'New chat', 'dry_run', true, 30],
    ['l5', 'gemini', 'g5', 'test prompt', 'dry_run', true, 31],
  ].map(function (l) {
    return { id: l[0], batchId: 'demo', timestamp: now - l[6] * 60000, platform: l[1], chatId: l[2], chatTitle: l[3], action: l[4], success: l[5], verified: true };
  });

  window.seedChatSweepDemo = function (theme) {
    var state = {
      version: 1,
      settings: {
        schemaVersion: 1, dryRunDefault: true, maxBatchSize: 10, actionDelayMs: 1200,
        protectedKeywords: ['taxes', 'legal', 'client', 'important', 'contract', 'confidential'],
        protectedRegexPatterns: ['^\\[work\\].*', '^\\[save\\].*'],
        protectedChatIds: ['c6', 'a3'], minimumAgeDays: 3, confidenceThreshold: 0.65,
        enabledPlatforms: { chatgpt: true, gemini: true, claude: true },
        autoScanOnVisit: false, theme: theme, onboardingCompleted: true, aiClassificationOptIn: false,
      },
      chats: chats.reduce(function (acc, c) { acc[c.id] = c; return acc; }, {}),
      operationLogs: logs,
      platformStatus: {
        chatgpt: { lastScanTimestamp: now - 12 * 60000, connected: true, totalDiscovered: 6 },
        gemini: { lastScanTimestamp: now - 2 * HOUR, connected: true, totalDiscovered: 4 },
        claude: { lastScanTimestamp: now - 40 * 60000, connected: true, totalDiscovered: 5 },
      },
    };
    localStorage.setItem('chatsweep_state_v1', JSON.stringify(state));
    localStorage.setItem('chatsweep-theme', theme);
  };

  // Runs fn(doc) once the iframe's app has rendered something matching selector.
  window.whenReady = function (iframe, selector, fn) {
    var tries = 0;
    (function poll() {
      var doc = iframe.contentDocument;
      if (doc && doc.querySelector(selector)) return fn(doc);
      if (++tries < 100) setTimeout(poll, 50);
    })();
  };

  // Clicks a button-like element whose text contains `text`.
  window.clickByText = function (doc, selector, text) {
    var el = Array.prototype.find.call(doc.querySelectorAll(selector), function (e) {
      return e.textContent.trim().indexOf(text) !== -1;
    });
    if (el) el.click();
    return el;
  };

  // Ticks the row checkbox for each title in the conversation table.
  window.selectRows = function (doc, titles) {
    doc.querySelectorAll('tbody tr').forEach(function (row) {
      var link = row.querySelector('a');
      var box = row.querySelector('input[type="checkbox"]');
      if (link && box && titles.indexOf(link.textContent.trim()) !== -1 && !box.checked) box.click();
    });
  };
})();

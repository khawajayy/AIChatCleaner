// Injected into the popup for screenshots only. Fakes the bits of the chrome.* API the popup
// calls so it can render outside an extension, pretending the active tab is ?site=<platform>.
(function () {
  var params = new URLSearchParams(location.search);
  var site = params.get('site') || 'chatgpt';
  var theme = params.get('theme');
  var urls = { chatgpt: 'https://chatgpt.com/', gemini: 'https://gemini.google.com/app', claude: 'https://claude.ai/new' };

  window.chrome = {
    tabs: {
      query: function () { return Promise.resolve([{ id: 1, url: urls[site] }]); },
      create: function () {},
    },
    runtime: {
      sendMessage: function () { return Promise.resolve({ success: true, count: 15 }); },
      getURL: function (p) { return '/' + p; },
    },
  };

  // Both popup iframes share one localStorage, so give this frame its own theme by
  // overriding what it reads. The app then applies the theme (and toggle state) itself.
  if (theme) {
    var getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      var value = getItem.call(this, key);
      if (key === 'chatsweep-theme') return theme;
      if (key === 'chatsweep_state_v1' && value) {
        var state = JSON.parse(value);
        state.settings.theme = theme;
        return JSON.stringify(state);
      }
      return value;
    };
  }
})();

// Landing page script (docs/index.html). Bundled to docs/assets/site.js by `npm run site`.
// The live demo runs the extension's real classifier, so it always matches what ChatSweep does.
import { ClassificationEngine } from '../src/classifier/engine';
import { DEFAULT_SETTINGS } from '../src/storage/schema';
import { ChatMetadata, ClassificationCategory, PlatformId } from '../src/types';

declare const __APP_VERSION__: string;

const SAMPLE_CHATS: [PlatformId, string][] = [
  ['chatgpt', 'New chat'],
  ['chatgpt', 'test'],
  ['gemini', 'asdf'],
  ['claude', 'hi'],
  ['chatgpt', 'convert 72F to celsius'],
  ['chatgpt', 'Q3 marketing plan outline'],
  ['claude', 'Rewrite cover letter for PM role'],
  ['chatgpt', '[Work] API rate limit design'],
  ['gemini', 'testing 123'],
  ['claude', 'Tax return questions'],
  ['gemini', 'capital of australia'],
  ['chatgpt', 'New chat'],
  ['claude', 'SQL window functions explained'],
  ['gemini', 'Trip itinerary: Lisbon in May'],
];

const PLATFORM_LABEL: Record<PlatformId, string> = { chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' };
const CATEGORY_LABEL: Record<ClassificationCategory, string> = { cleanup: 'Cleanup', review: 'Review', keep: 'Keep' };

interface DemoChat {
  key: number;
  platform: PlatformId;
  title: string;
}

let nextKey = 1;
let chats: DemoChat[] = [];
let keywords: string[] = [];
let swept = new Set<number>();
let activeTab: ClassificationCategory = 'cleanup';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);

function resetSamples() {
  chats = SAMPLE_CHATS.map(([platform, title]) => ({ key: nextKey++, platform, title }));
  keywords = [...DEFAULT_SETTINGS.protectedKeywords];
  swept = new Set();
}

function toMetadata(chat: DemoChat): ChatMetadata {
  // Mirrors what the content script records for a sidebar entry
  return {
    id: `demo-${chat.key}`,
    platform: chat.platform,
    title: chat.title,
    url: '',
    lastActivityTimestamp: null,
    messageCount: null,
    isEmpty: chat.title.toLowerCase() === 'new chat',
    isUnfinished: false,
    category: 'keep',
    confidence: 0.5,
    reasons: [],
    lastScannedAt: Date.now(),
    supportsArchive: chat.platform === 'chatgpt',
    supportsDelete: true,
    status: 'discovered',
    isProtected: false,
    firstSeenAt: null,
  };
}

function classify() {
  const visible = chats.filter((c) => !swept.has(c.key));
  const settings = { ...DEFAULT_SETTINGS, protectedKeywords: keywords };
  const results = ClassificationEngine.classifyBatch(visible.map(toMetadata), settings);
  return visible.map((chat, i) => ({ chat, result: results[i] }));
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function platformMark(platform: PlatformId) {
  const mark = el('span', `pmark pmark-${platform}`, PLATFORM_LABEL[platform][0]);
  mark.title = PLATFORM_LABEL[platform];
  return mark;
}

function render() {
  const classified = classify();

  // Sidebar
  const list = $('#demo-sidebar')!;
  list.replaceChildren();
  for (const chat of chats) {
    const li = el('li', swept.has(chat.key) ? 'side-item is-swept' : 'side-item');
    li.append(platformMark(chat.platform), el('span', 'side-title', chat.title));
    const remove = el('button', 'icon-btn', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove "${chat.title}" from the demo`);
    remove.addEventListener('click', () => {
      chats = chats.filter((c) => c.key !== chat.key);
      swept.delete(chat.key);
      render();
    });
    li.append(remove);
    list.append(li);
  }
  $('#demo-sidebar-count')!.textContent = `${chats.length - swept.size} chats`;

  // Keywords
  const chipBox = $('#demo-keywords')!;
  chipBox.replaceChildren();
  for (const kw of keywords) {
    const chip = el('span', 'chip');
    chip.append(el('span', '', kw));
    const x = el('button', 'chip-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', `Remove protected keyword "${kw}"`);
    x.addEventListener('click', () => {
      keywords = keywords.filter((k) => k !== kw);
      render();
    });
    chip.append(x);
    chipBox.append(chip);
  }

  // Results
  const byCategory: Record<ClassificationCategory, typeof classified> = { cleanup: [], review: [], keep: [] };
  for (const item of classified) byCategory[item.result.category].push(item);

  for (const cat of ['cleanup', 'review', 'keep'] as ClassificationCategory[]) {
    const tab = $(`[data-tab="${cat}"]`)!;
    tab.querySelector('.tab-count')!.textContent = String(byCategory[cat].length);
    tab.setAttribute('aria-selected', String(cat === activeTab));
  }

  const out = $('#demo-results')!;
  out.replaceChildren();
  const items = byCategory[activeTab];
  if (items.length === 0) {
    out.append(el('li', 'result-empty', activeTab === 'cleanup' ? 'Nothing to clean up. Your sidebar is spotless.' : `No chats in ${CATEGORY_LABEL[activeTab]}.`));
  }
  for (const { chat, result } of items) {
    const li = el('li', 'result');
    const head = el('div', 'result-head');
    head.append(platformMark(chat.platform), el('span', 'result-title', chat.title));
    if (result.isProtected) head.append(el('span', 'badge badge-protected', 'Protected'));
    head.append(el('span', `badge badge-${result.category}`, `${CATEGORY_LABEL[result.category]} ${Math.round(result.confidence * 100)}%`));
    li.append(head, el('p', 'result-reason', result.reasons[0] ?? ''));
    out.append(li);
  }

  const cleanupCount = byCategory.cleanup.length;
  const sweepBtn = $<HTMLButtonElement>('#demo-sweep')!;
  const dryRun = $<HTMLInputElement>('#demo-dryrun')!.checked;
  sweepBtn.disabled = cleanupCount === 0;
  sweepBtn.textContent = cleanupCount === 0 ? 'Nothing to sweep' : dryRun ? `Dry run ${cleanupCount} cleanup chat${cleanupCount === 1 ? '' : 's'}` : `Sweep ${cleanupCount} chat${cleanupCount === 1 ? '' : 's'}`;
  sweepBtn.classList.toggle('btn-danger', !dryRun);
  $('#demo-restore')!.hidden = swept.size === 0;
}

function toast(message: string) {
  const box = $('#demo-toast')!;
  box.textContent = message;
  box.hidden = false;
}

function sweep() {
  const dryRun = $<HTMLInputElement>('#demo-dryrun')!.checked;
  const targets = classify().filter((x) => x.result.category === 'cleanup');
  if (targets.length === 0) return;

  if (dryRun) {
    document.querySelectorAll('#demo-sidebar .side-item').forEach((li, i) => {
      const chat = chats[i];
      li.classList.toggle('is-target', targets.some((t) => t.chat.key === chat.key));
    });
    toast(`Dry run: ${targets.length} chat${targets.length === 1 ? '' : 's'} would be deleted. Nothing was changed. Turn dry run off to sweep.`);
    return;
  }
  for (const t of targets) swept.add(t.chat.key);
  toast(`Swept ${targets.length} chat${targets.length === 1 ? '' : 's'} from the demo sidebar. Protected chats were left alone.`);
  render();
}

function initDemo() {
  if (!$('#demo')) return;
  resetSamples();

  $('#demo-add-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>('#demo-add-title')!;
    const platform = $<HTMLSelectElement>('#demo-add-platform')!.value as PlatformId;
    const title = input.value.trim().slice(0, 120);
    if (!title) return;
    chats.unshift({ key: nextKey++, platform, title });
    input.value = '';
    // Jump to wherever the new chat landed
    activeTab = classify().find((x) => x.chat.title === title)?.result.category ?? activeTab;
    render();
  });

  $('#demo-kw-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>('#demo-kw-input')!;
    const kw = input.value.trim().toLowerCase().slice(0, 40);
    if (kw && !keywords.includes(kw)) keywords.push(kw);
    input.value = '';
    render();
  });

  document.querySelectorAll<HTMLElement>('[data-tab]').forEach((tab) =>
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab as ClassificationCategory;
      render();
    })
  );

  $('#demo-dryrun')!.addEventListener('change', () => {
    document.querySelectorAll('#demo-sidebar .is-target').forEach((li) => li.classList.remove('is-target'));
    $('#demo-toast')!.hidden = true;
    render();
  });
  $('#demo-sweep')!.addEventListener('click', sweep);
  $('#demo-restore')!.addEventListener('click', () => {
    swept = new Set();
    $('#demo-toast')!.hidden = true;
    render();
  });
  $('#demo-reset')!.addEventListener('click', () => {
    resetSamples();
    activeTab = 'cleanup';
    $('#demo-toast')!.hidden = true;
    render();
  });

  render();
}

/** Store link: set <meta name="chatsweep:store-url"> in index.html once the listing is approved. */
function initInstall() {
  const storeUrl = document.querySelector<HTMLMetaElement>('meta[name="chatsweep:store-url"]')?.content.trim();
  document.querySelectorAll<HTMLElement>('[data-version]').forEach((n) => (n.textContent = `v${__APP_VERSION__}`));
  document.documentElement.classList.toggle('has-store', !!storeUrl);
  if (storeUrl) {
    document.querySelectorAll<HTMLAnchorElement>('a[data-store-link]').forEach((a) => (a.href = storeUrl));
  }

  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy!);
        const label = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => (btn.textContent = label), 1500);
      } catch {
        // Clipboard blocked: the text is visible next to the button anyway
      }
    })
  );
}

function initVideo() {
  const video = $<HTMLVideoElement>('#hero-video');
  if (!video) return;
  // Respect reduced motion: show the poster with controls instead of autoplaying
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.removeAttribute('autoplay');
    video.pause();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initInstall();
  initDemo();
  initVideo();
});

import { ChatAdapter, ChatDetails, PlatformCapabilities } from './types';
import { ActionResult, ChatMetadata, PlatformId } from '../types';

/** Describes one sidebar-menu action (delete / archive) for a platform. */
export interface MenuActionSpec {
  action: 'delete' | 'archive';
  /** Preferred selectors for the menu item, tried before the label match. */
  menuItemSelectors: string[];
  menuItemLabel: RegExp;
  /** Present when the platform asks for confirmation in a dialog. */
  confirm?: {
    selectors: string[];
    label: RegExp;
  };
}

const MENU_SELECTOR = '[role="menu"]';
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

export abstract class BaseAdapter implements ChatAdapter {
  abstract readonly platform: PlatformId;
  abstract readonly displayName: string;
  abstract readonly capabilities: PlatformCapabilities;

  /** Matches a conversation path and captures its id, e.g. /\/c\/([\w-]+)/ */
  protected abstract readonly chatPathPattern: RegExp;
  /** Selectors for the per-row "more options" button, most specific first. */
  protected abstract readonly menuButtonSelectors: string[];
  protected abstract readonly deleteSpec: MenuActionSpec;
  protected readonly archiveSpec: MenuActionSpec | null = null;

  /** Wait budgets in ms. Overridable so tests can run fast. */
  public timing = { reveal: 250, menu: 2500, dialog: 4000, removal: 8000 };

  abstract detectPage(): boolean;
  protected abstract buildChatUrl(id: string): string;
  protected abstract readonly fallbackTitle: string;

  // ---------------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------------

  public async discoverChats(): Promise<ChatMetadata[]> {
    if (!this.detectPage()) return [];

    const discovered: ChatMetadata[] = [];
    const seen = new Set<string>();

    for (const link of this.findChatLinks()) {
      const id = this.extractChatId(link.getAttribute('href'));
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const title = this.readTitle(link) || this.fallbackTitle;
      discovered.push({
        id,
        platform: this.platform,
        title,
        url: this.buildChatUrl(id),
        lastActivityTimestamp: null,
        messageCount: null,
        isEmpty: title.toLowerCase() === 'new chat',
        isUnfinished: false,
        category: 'keep',
        confidence: 0.5,
        reasons: [],
        lastScannedAt: Date.now(),
        supportsArchive: this.capabilities.supportsArchive,
        supportsDelete: this.capabilities.supportsDelete,
        status: 'discovered',
        isProtected: false,
      });
    }

    return discovered;
  }

  public async getChatDetails(chat: ChatMetadata): Promise<ChatDetails | null> {
    if (!(await this.validateChatIdentity(chat))) return null;
    return {
      id: chat.id,
      title: chat.title,
      url: chat.url,
      messageCount: chat.messageCount,
      lastActivityTimestamp: chat.lastActivityTimestamp,
    };
  }

  protected extractChatId(href: string | null): string | null {
    if (!href) return null;
    const match = href.match(this.chatPathPattern);
    return match ? match[1] : null;
  }

  protected findChatLinks(root: ParentNode = document): HTMLAnchorElement[] {
    return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]')).filter(
      (a) => this.extractChatId(a.getAttribute('href')) !== null
    );
  }

  /** Text of the link minus any button labels nested inside it. */
  protected readTitle(link: HTMLAnchorElement): string {
    const clone = link.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button, [role="button"], svg').forEach((el) => el.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /** Exact id match only. Never falls back to title matching. */
  public findChatLink(chatId: string): HTMLAnchorElement | null {
    return this.findChatLinks().find((a) => this.extractChatId(a.getAttribute('href')) === chatId) ?? null;
  }

  public isChatPresent(chatId: string): boolean {
    return !!this.findChatLink(chatId);
  }

  public countChatLinks(root: ParentNode = document): number {
    return new Set(this.findChatLinks(root).map((a) => this.extractChatId(a.getAttribute('href')))).size;
  }

  public async validateChatIdentity(chat: ChatMetadata): Promise<boolean> {
    if (!chat?.id || !this.detectPage()) return false;
    return this.isChatPresent(chat.id);
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  public deleteChat(chat: ChatMetadata, dryRun = false): Promise<ActionResult> {
    if (!this.capabilities.supportsDelete) {
      return Promise.resolve(this.result(chat, dryRun ? 'dry_run' : 'delete', false, `${this.displayName} does not support deleting.`));
    }
    return this.runMenuAction(chat, this.deleteSpec, dryRun);
  }

  public archiveChat(chat: ChatMetadata, dryRun = false): Promise<ActionResult> {
    if (!this.capabilities.supportsArchive || !this.archiveSpec) {
      return Promise.resolve(
        this.result(chat, dryRun ? 'dry_run' : 'archive', false, `Archive is not supported by ${this.displayName}.`)
      );
    }
    return this.runMenuAction(chat, this.archiveSpec, dryRun);
  }

  /**
   * Opens the conversation's row menu, picks the action, confirms if asked, then
   * waits until the conversation's link is gone from the page.
   */
  protected async runMenuAction(chat: ChatMetadata, spec: MenuActionSpec, dryRun: boolean): Promise<ActionResult> {
    const actionName = dryRun ? 'dry_run' : spec.action;

    if (!this.detectPage()) {
      return this.result(chat, actionName, false, `This tab is not ${this.displayName}.`);
    }

    const link = this.findChatLink(chat.id);
    if (!link) {
      return this.result(
        chat,
        actionName,
        false,
        `"${chat.title}" isn't loaded in the ${this.displayName} sidebar. Scroll the sidebar to it or rescan, then try again.`
      );
    }

    if (dryRun) {
      // Non-destructive check that the controls we need are reachable.
      const button = await this.revealMenuButton(link);
      return button
        ? this.result(chat, 'dry_run', true)
        : this.result(chat, 'dry_run', false, `Found "${chat.title}" but not its options menu button.`);
    }

    try {
      await this.dismissOverlays();

      const menu = await this.openRowMenu(link);
      const item = this.findMenuItem(menu, spec);
      if (!item) throw new Error(`"${this.capitalize(spec.action)}" isn't in this conversation's menu.`);
      this.realClick(item);

      if (spec.confirm) {
        const confirmSpec = spec.confirm;
        const confirmButton = await this.waitFor(() => this.findConfirmButton(confirmSpec), this.timing.dialog);
        if (!confirmButton) throw new Error('The confirmation dialog did not appear.');
        this.realClick(confirmButton);
      }

      const gone = await this.waitFor(() => (this.isChatPresent(chat.id) ? null : true), this.timing.removal);
      if (!gone) {
        return this.result(chat, spec.action, false, `"${chat.title}" is still in the sidebar after the ${spec.action} attempt.`);
      }
      return this.result(chat, spec.action, true);
    } catch (err: any) {
      await this.dismissOverlays();
      return this.result(chat, spec.action, false, err?.message || `Failed to ${spec.action} the conversation.`);
    }
  }

  protected result(
    chat: ChatMetadata,
    action: ActionResult['action'],
    success: boolean,
    error?: string
  ): ActionResult {
    return {
      success,
      action,
      chatId: chat.id,
      platform: this.platform,
      timestamp: Date.now(),
      verified: success,
      error: success ? undefined : error,
    };
  }

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------

  /** Finds the options button belonging to this row without crossing into a neighbouring row. */
  protected findRowMenuButton(link: HTMLAnchorElement): HTMLElement | null {
    const selector = this.menuButtonSelectors.join(', ');
    const inside = link.querySelector<HTMLElement>(selector);
    if (inside) return inside;

    let node: HTMLElement | null = link.parentElement;
    for (let depth = 0; node && depth < 6; depth++) {
      if (this.countChatLinks(node) > 1) break;
      const button = node.querySelector<HTMLElement>(selector);
      if (button) return button;
      node = node.parentElement;
    }
    return null;
  }

  /** Hover-only buttons are often rendered on pointer enter, so hover first. */
  protected async revealMenuButton(link: HTMLAnchorElement): Promise<HTMLElement | null> {
    let button = this.findRowMenuButton(link);
    if (button) return button;
    this.hover(link);
    if (link.parentElement) this.hover(link.parentElement);
    await this.sleep(this.timing.reveal);
    button = this.findRowMenuButton(link);
    return button;
  }

  protected async openRowMenu(link: HTMLAnchorElement): Promise<HTMLElement> {
    this.hover(link);
    const button = await this.revealMenuButton(link);
    if (!button) throw new Error("Couldn't find this conversation's options button.");

    const menusBefore = new Set(this.openMenus());
    const newMenu = () => this.openMenus().find((m) => !menusBefore.has(m)) ?? null;

    this.realClick(button);
    let menu = await this.waitFor(newMenu, this.timing.menu);

    if (!menu) {
      // Keyboard fallback for menus that ignore synthetic pointer events
      button.focus();
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
      menu = await this.waitFor(newMenu, this.timing.menu);
    }
    if (!menu) throw new Error("The conversation's menu didn't open.");

    // Make sure the menu belongs to this row's button before acting on it.
    const controls = button.getAttribute('aria-controls');
    if (controls && menu.id && controls !== menu.id) {
      throw new Error('A different menu opened than expected. Stopped for safety.');
    }
    return menu;
  }

  protected openMenus(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(MENU_SELECTOR)).filter((m) => this.isVisible(m));
  }

  protected findMenuItem(menu: HTMLElement, spec: MenuActionSpec): HTMLElement | null {
    for (const selector of spec.menuItemSelectors) {
      const el = menu.querySelector<HTMLElement>(selector);
      if (el) return el;
    }
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"], button'));
    return (
      items.find((el) => {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return spec.menuItemLabel.test(text) && !/\ball\b/i.test(text);
      }) ?? null
    );
  }

  protected findConfirmButton(confirm: NonNullable<MenuActionSpec['confirm']>): HTMLElement | null {
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)).filter((d) => this.isVisible(d));
    // Newest dialog last in DOM order
    for (const dialog of dialogs.reverse()) {
      for (const selector of confirm.selectors) {
        const el = dialog.querySelector<HTMLElement>(selector);
        if (el) return el;
      }
      const button = Array.from(dialog.querySelectorAll<HTMLElement>('button')).find((b) => {
        const text = (b.textContent || '').replace(/\s+/g, ' ').trim();
        return confirm.label.test(text) && !/cancel/i.test(text);
      });
      if (button) return button;
    }
    return null;
  }

  protected isVisible(el: Element): boolean {
    if (!el.isConnected || el.closest('[hidden], [aria-hidden="true"]')) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  /** Full pointer + mouse sequence. Radix menus open on pointerdown and ignore a bare .click(). */
  protected realClick(el: HTMLElement): void {
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
    const rect = el.getBoundingClientRect();
    const base = {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    const pointer = (type: string, buttons: number) => this.pointerEvent(type, { ...base, buttons });

    el.dispatchEvent(pointer('pointerover', 0));
    el.dispatchEvent(new MouseEvent('mouseover', { ...base, buttons: 0 }));
    el.dispatchEvent(pointer('pointerdown', 1));
    el.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }));
    el.focus?.();
    el.dispatchEvent(pointer('pointerup', 0));
    el.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0 }));
  }

  protected hover(el: Element): void {
    const base = { bubbles: true, cancelable: true, composed: true };
    el.dispatchEvent(this.pointerEvent('pointerover', base));
    el.dispatchEvent(this.pointerEvent('pointerenter', { ...base, bubbles: false }));
    el.dispatchEvent(new MouseEvent('mouseover', base));
    el.dispatchEvent(new MouseEvent('mouseenter', { ...base, bubbles: false }));
    el.dispatchEvent(this.pointerEvent('pointermove', base));
  }

  private pointerEvent(type: string, init: MouseEventInit): Event {
    if (typeof PointerEvent === 'function') {
      return new PointerEvent(type, { ...init, pointerId: 1, pointerType: 'mouse', isPrimary: true });
    }
    return new MouseEvent(type, init);
  }

  protected async dismissOverlays(): Promise<void> {
    if (this.openMenus().length === 0) return;
    const target = document.activeElement ?? document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    await this.sleep(150);
    if (this.openMenus().length === 0) return;

    // Angular Material (Gemini) menus ignore a synthetic Escape; clicking the empty backdrop closes them.
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
    await this.sleep(150);
  }

  /** Polls until fn returns a non-null value or the timeout passes. */
  protected async waitFor<T>(fn: () => T | null, timeoutMs: number): Promise<T | null> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const value = fn();
      if (value !== null && value !== undefined) return value;
      if (Date.now() >= deadline) return null;
      await this.sleep(100);
    }
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

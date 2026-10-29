import { ChatMetadata } from '../types';

/**
 * Sets `firstSeenAt` on freshly scanned chats. The sites don't show creation
 * dates, so this is the only age signal ChatSweep has.
 *
 * Sidebars list chats newest first. A chat we have never seen counts as new only
 * when it sits above a chat we already know from an earlier scan. Chats that
 * show up below every known chat were most likely loaded by scrolling further
 * down, so their age stays unknown (null). On the first scan of a platform
 * nothing is known yet, so every chat's age is unknown.
 *
 * Errors lean towards keeping: an old chat that jumps to the top (new activity,
 * pinned) is treated as new, which only protects it.
 *
 * @param scanned chats in sidebar order, top first
 * @param known stored chats from earlier scans, keyed by id
 */
export function stampFirstSeen(
  scanned: ChatMetadata[],
  known: Record<string, ChatMetadata>,
  now = Date.now()
): ChatMetadata[] {
  const isKnown = (chat: ChatMetadata) => known[chat.id]?.platform === chat.platform;

  let lowestKnownIndex = -1;
  scanned.forEach((chat, i) => {
    if (isKnown(chat)) lowestKnownIndex = i;
  });

  return scanned.map((chat, i) => {
    if (isKnown(chat)) {
      return { ...chat, firstSeenAt: known[chat.id].firstSeenAt ?? null };
    }
    return { ...chat, firstSeenAt: i < lowestKnownIndex ? now : null };
  });
}

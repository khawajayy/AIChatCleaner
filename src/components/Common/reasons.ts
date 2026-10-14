// Classifier reasons start with their category ("Cleanup candidate: ...", "Review: ...").
// Wherever a badge already shows the category, display the reason without that prefix.
const CATEGORY_PREFIX = /^(cleanup candidate|empty conversation|review|keep|protected|user decision):\s*/i;

export function displayReason(reason: string): string {
  const text = reason.replace(CATEGORY_PREFIX, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

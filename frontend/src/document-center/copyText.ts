/**
 * Copy plain text in both secure contexts and legacy/non-secure HTTP pages.
 * The execCommand fallback must run from the original click task, so callers
 * should invoke this directly from their click handler.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through for HTTP pages and browsers that deny clipboard permission.
    }
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }

  let eventCopied = false;
  const handleCopy = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData('text/plain', text);
    eventCopied = true;
  };

  document.addEventListener('copy', handleCopy, { once: true });
  try {
    const result = document.execCommand('copy') || eventCopied;
    if (!eventCopied) {
      document.removeEventListener('copy', handleCopy);
    }
    return result;
  } catch {
    document.removeEventListener('copy', handleCopy);
    return false;
  }
}

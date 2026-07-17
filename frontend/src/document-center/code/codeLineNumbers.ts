/** Returns one-based logical line numbers, including blank and trailing lines. */
export function getCodeLineNumbers(code: string): number[] {
  return Array.from({ length: code.split(/\r?\n/).length }, (_, index) => index + 1);
}

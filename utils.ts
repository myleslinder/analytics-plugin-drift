export const isBrowser = typeof window !== "undefined";

class AssertionError extends Error {
  constructor(message?: string) {
    super(`AssertionError: ${message}`);
    this.name = "AssertionError";
  }
}

export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new AssertionError(msg);
  }
}

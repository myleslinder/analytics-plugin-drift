export const isBrowser = typeof window !== "undefined";

export function sleep(delay: number) {
  let timeoutId: number;
  return [
    new Promise((resolve) => (timeoutId = setTimeout(resolve, delay))),
    () => clearTimeout(timeoutId),
  ];
}

const isError = (e: unknown): e is Error => {
  return e instanceof Error;
};
export const unknownErrorToObject = (e: unknown) => {
  return isError(e) ? e : new Error(`Unknown Error: ${JSON.stringify(e)}`);
};

type NoOp = (...args: unknown[]) => void;
export const noop: NoOp = () => undefined;

class AssertionError extends Error {
  constructor(message?: string) {
    super(`AssertionError: ${message ?? "No message provided"}`);
    this.name = "AssertionError";
  }
}

export function assert(condition: boolean, msg?: string): asserts condition {
  if (!condition) {
    throw new AssertionError(msg);
  }
}

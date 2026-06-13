let pending = 0;
const listeners = new Set<() => void>();

export function getApiLoadingPending(): number {
  return pending;
}

export function subscribeApiLoading(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function beginApiLoading(): void {
  pending += 1;
  notify();
}

export function endApiLoading(): void {
  pending = Math.max(0, pending - 1);
  notify();
}

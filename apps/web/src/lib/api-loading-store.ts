let apiPending = 0;
let navPending = 0;
const listeners = new Set<() => void>();

export function getLoadingPending(): number {
  return apiPending + navPending;
}

/** @deprecated Use getLoadingPending — kept for existing imports */
export function getApiLoadingPending(): number {
  return getLoadingPending();
}

export function subscribeApiLoading(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function beginApiLoading(): void {
  apiPending += 1;
  notify();
}

export function endApiLoading(): void {
  apiPending = Math.max(0, apiPending - 1);
  notify();
}

export function beginNavigationLoading(): void {
  navPending += 1;
  notify();
}

export function resetNavigationLoading(): void {
  if (navPending === 0) return;
  navPending = 0;
  notify();
}

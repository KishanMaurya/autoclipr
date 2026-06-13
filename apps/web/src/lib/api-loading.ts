const CREATE_FLOW_ROUTE_PREFIXES = ["/create", "/upload"];

const CREATE_FLOW_API_PATTERNS = [
  /^\/api\/v1\/videos\/import-url/,
  /^\/api\/v1\/videos\/upload/,
  /^\/api\/v1\/videos\/[^/]+\/pipeline/,
  /^\/api\/v1\/videos\/[^/]+\/complete/,
  /^\/api\/v1\/clips\/generate/,
];

export function isCreateFlowRoute(pathname: string): boolean {
  return CREATE_FLOW_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isCreateFlowApiPath(path: string): boolean {
  const normalized = path.split("?")[0] ?? path;
  return CREATE_FLOW_API_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function shouldSkipGlobalApiLoader(
  path: string,
  skipGlobalLoader?: boolean,
): boolean {
  if (skipGlobalLoader) return true;
  if (isCreateFlowApiPath(path)) return true;

  if (typeof window !== "undefined" && isCreateFlowRoute(window.location.pathname)) {
    return true;
  }

  return false;
}

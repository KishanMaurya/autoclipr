/**
 * Carries an operator-facing diagnosis alongside a user-facing error.
 *
 * A failed import produces two different readers' worth of information. The
 * message is written for the customer and is deliberately vague — it must not
 * leak proxy hosts or env var names — which leaves the operator with a line
 * that names a symptom and no cause.
 *
 * Logging the cause separately was tried and did not work: it lands in its own
 * entry, while the alert, the dashboard and the copy-pasted report all quote
 * the failure event. The diagnosis has to travel *on* the error so it arrives
 * in the same place the symptom does.
 */
export interface DiagnosableError extends Error {
  /** Operator-facing cause and remedy. Never shown to the customer. */
  diagnosis?: string;
}

/** Attach an operator diagnosis to an error, returning the same error. */
export function withDiagnosis<T extends Error>(err: T, diagnosis: string): T & DiagnosableError {
  (err as T & DiagnosableError).diagnosis = diagnosis;
  return err as T & DiagnosableError;
}

/** Read a diagnosis off an unknown thrown value, if it has one. */
export function diagnosisOf(err: unknown): string | undefined {
  if (err instanceof Error) {
    const { diagnosis } = err as DiagnosableError;
    if (typeof diagnosis === 'string' && diagnosis.length > 0) return diagnosis;
  }
  return undefined;
}

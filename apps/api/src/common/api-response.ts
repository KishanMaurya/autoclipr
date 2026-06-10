export class ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;

  static ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
    return { success: true, data, meta };
  }

  static fail(code: string, message: string): ApiResponse<never> {
    return { success: false, error: { code, message } };
  }
}

const mockLoadNewRelic = jest.fn();
const mockNoticeError = jest.fn();
const mockStructuredLog = jest.fn();

jest.mock('@autoclipr/monitoring', () => ({
  loadNewRelic: mockLoadNewRelic,
  structuredLog: mockStructuredLog,
  MonitoringService: jest.fn().mockImplementation(() => ({
    noticeError: mockNoticeError,
  })),
}));

/**
 * instrumentation.ts registers real process-level listeners as a side effect
 * of being imported. We load it fresh per test via isolateModules and always
 * strip whatever listeners it added afterward, so this file never leaks
 * handlers into the rest of the suite.
 */
function loadInstrumentationModule() {
  const before = {
    unhandledRejection: process.listeners('unhandledRejection').slice(),
    uncaughtException: process.listeners('uncaughtException').slice(),
  };

  jest.isolateModules(() => {
    require('./instrumentation');
  });

  const addedUnhandledRejection = process
    .listeners('unhandledRejection')
    .filter((l) => !before.unhandledRejection.includes(l));
  const addedUncaughtException = process
    .listeners('uncaughtException')
    .filter((l) => !before.uncaughtException.includes(l));

  return { addedUnhandledRejection, addedUncaughtException };
}

describe('instrumentation', () => {
  const originalAppName = process.env.NEW_RELIC_APP_NAME;
  let installed: ReturnType<typeof loadInstrumentationModule> | undefined;

  afterEach(() => {
    if (installed) {
      for (const l of installed.addedUnhandledRejection) {
        process.removeListener('unhandledRejection', l as NodeJS.UnhandledRejectionListener);
      }
      for (const l of installed.addedUncaughtException) {
        process.removeListener('uncaughtException', l as NodeJS.UncaughtExceptionListener);
      }
    }
    installed = undefined;
    if (originalAppName === undefined) {
      delete process.env.NEW_RELIC_APP_NAME;
    } else {
      process.env.NEW_RELIC_APP_NAME = originalAppName;
    }
    jest.clearAllMocks();
  });

  it('loads New Relic on import', () => {
    installed = loadInstrumentationModule();
    expect(mockLoadNewRelic).toHaveBeenCalledTimes(1);
  });

  it('constructs MonitoringService with NEW_RELIC_APP_NAME when set', () => {
    process.env.NEW_RELIC_APP_NAME = 'custom-app-name';
    const { MonitoringService } = jest.requireMock('@autoclipr/monitoring');

    installed = loadInstrumentationModule();

    expect(MonitoringService).toHaveBeenCalledWith('custom-app-name');
  });

  it('constructs MonitoringService with the default app name when unset', () => {
    delete process.env.NEW_RELIC_APP_NAME;
    const { MonitoringService } = jest.requireMock('@autoclipr/monitoring');

    installed = loadInstrumentationModule();

    expect(MonitoringService).toHaveBeenCalledWith('AutoClipr API');
  });

  it('registers exactly one unhandledRejection and one uncaughtException listener', () => {
    installed = loadInstrumentationModule();

    expect(installed.addedUnhandledRejection).toHaveLength(1);
    expect(installed.addedUncaughtException).toHaveLength(1);
  });

  it('reports an Error reason to monitoring on unhandledRejection', () => {
    installed = loadInstrumentationModule();
    const error = new Error('boom');

    installed.addedUnhandledRejection[0](error, Promise.resolve());

    expect(mockNoticeError).toHaveBeenCalledWith(error, { source: 'unhandledRejection' });
  });

  it('wraps a non-Error rejection reason in an Error before reporting', () => {
    installed = loadInstrumentationModule();

    installed.addedUnhandledRejection[0]('a plain string reason', Promise.resolve());

    expect(mockNoticeError).toHaveBeenCalledWith(
      expect.any(Error),
      { source: 'unhandledRejection' },
    );
    const reportedError = mockNoticeError.mock.calls[0][0] as Error;
    expect(reportedError.message).toBe('a plain string reason');
  });

  it('wraps a nullish rejection reason with a fallback message', () => {
    installed = loadInstrumentationModule();

    installed.addedUnhandledRejection[0](undefined, Promise.resolve());

    const reportedError = mockNoticeError.mock.calls[0][0] as Error;
    expect(reportedError.message).toBe('Unhandled rejection');
  });

  it('reports and structured-logs on uncaughtException', () => {
    process.env.NEW_RELIC_APP_NAME = 'custom-app-name';
    installed = loadInstrumentationModule();
    const error = new Error('fatal');

    installed.addedUncaughtException[0](error, 'uncaughtException');

    expect(mockNoticeError).toHaveBeenCalledWith(error, { source: 'uncaughtException' });
    expect(mockStructuredLog).toHaveBeenCalledWith(
      'error',
      'fatal',
      { service: 'custom-app-name', source: 'uncaughtException' },
      error,
    );
  });

  it('uses the default service name in the structured log when NEW_RELIC_APP_NAME is unset', () => {
    delete process.env.NEW_RELIC_APP_NAME;
    installed = loadInstrumentationModule();
    const error = new Error('fatal');

    installed.addedUncaughtException[0](error, 'uncaughtException');

    expect(mockStructuredLog).toHaveBeenCalledWith(
      'error',
      'fatal',
      { service: 'AutoClipr API', source: 'uncaughtException' },
      error,
    );
  });
});

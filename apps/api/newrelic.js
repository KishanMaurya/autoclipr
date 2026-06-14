'use strict';

/**
 * New Relic agent config — loaded before NestJS bootstrap.
 * @see https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration
 */
exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'AutoClipr API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || '',
  agent_enabled: !!process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
  },
  distributed_tracing: {
    enabled: true,
  },
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 3000,
    },
    metrics: {
      enabled: true,
    },
  },
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.x-*',
    ],
  },
  allow_all_headers: false,
};

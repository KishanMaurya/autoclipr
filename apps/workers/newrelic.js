'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'AutoClipr Workers'],
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
      max_samples_stored: 2000,
    },
  },
  attributes: {
    exclude: ['request.headers.authorization'],
  },
};

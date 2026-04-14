/**
 * lib/logger.js
 * Verbose debug logs are silenced in production.
 * Errors are always logged regardless of environment.
 */

const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  /** Only prints in development */
  log: (...args) => { if (isDev) console.log(...args); },
  /** Only prints in development */
  warn: (...args) => { if (isDev) console.warn(...args); },
  /** Always prints — real errors should always be visible */
  error: (...args) => { console.error(...args); },
};

export default logger;

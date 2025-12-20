'use strict';

import os from 'node:os';
import * as Sentry from '@sentry/node';
import HomeyModule from 'homey';

if (!process.env.HOME) {
  // Sentry SDK requires the HOME env var to be set, which is not guaranteed on Homey
  process.env.HOME = os.tmpdir();
}

/**
 * @example
 * class MyApp extends Homey.App {
 *   onInit() {
 *     this.homeyLog = new Log({ homey: this.homey });
 *   }
 * }
 */
export class Log {
  _capturedMessages = [];
  _capturedExceptions = [];

  /**
   * Construct a new Log instance.
   * @param {object} args
   * @param {HomeyInstance} args.homey - `this.homey` instance in
   * your app (e.g. `App#homey`, `Driver#homey` or `Device#homey`).
   *
   * @param {object} [args.options] - Additional options for Sentry
   */
  constructor({ homey, options }) {
    if (typeof homey === 'undefined') {
      return Log._error('Error: missing `homey` constructor parameter');
    }

    if (!HomeyModule.env) {
      return Log._error('Error: could not access `Homey.env`');
    }

    if (typeof HomeyModule.env.HOMEY_LOG_URL !== 'string') {
      return Log._error('Error: expected `HOMEY_LOG_URL` env variable, homey-log is disabled');
    }

    // Check if debug mode is enabled
    const disableSentry = process.env.DEBUG === '1' && !Log._isLogForced();
    if (disableSentry) {
      Log._log('App is running in debug mode, not enabling Sentry logging');
    }

    let release;
    if (
      typeof HomeyModule.env.HOMEY_LOG_SENTRY_PROJECT === 'string' &&
      HomeyModule.env.HOMEY_LOG_SENTRY_PROJECT.length > 0
    ) {
      release = `${HomeyModule.env.HOMEY_LOG_SENTRY_PROJECT}@${HomeyModule.manifest.version}`;
    }

    this._manifest = HomeyModule.manifest;
    this._homeyVersion = homey.version;
    this._managerCloud = homey.cloud;
    this._homeyPlatform = homey.platform;
    this._homeyPlatformVersion = homey.platformVersion;

    // Init Sentry, pass enabled option to prevent sending events upstream when in debug mode
    this.init(HomeyModule.env.HOMEY_LOG_URL, { ...{ enabled: !disableSentry, release }, ...options });
  }

  /**
   * Init Sentry.
   * @param {string} dsn The Sentry DSN
   * @param {object} opts Options to be passed to the Sentry init
   * @returns {Log}
   * @private
   */
  init(dsn, opts) {
    Sentry.initWithoutDefaultIntegrations({
      ...{
        dsn,
        integrations: [
          // ...Sentry.getDefaultIntegrationsWithoutPerformance(),
          // It is no longer possible to use the default Sentry integrations as they use features
          // that are not available in older Node version, such as Node 12 on Homey Pro 2019.
          // The http instrumentation uses node:diagnostics_channel,
          // https://github.com/getsentry/sentry-javascript/commit/2e41f5ebeb40e748069111599d24149b264c78ba
          // So, carefully only include what we need instead.
          Sentry.eventFiltersIntegration(),
          Sentry.functionToStringIntegration(),
          Sentry.linkedErrorsIntegration(),
          Sentry.requestDataIntegration(),
          Sentry.consoleIntegration(),
          Sentry.onUncaughtExceptionIntegration(),
          Sentry.onUnhandledRejectionIntegration(),
          Sentry.contextLinesIntegration(),
          Sentry.localVariablesIntegration(),
          Sentry.nodeContextIntegration(),
        ],
        maxBreadcrumbs: 5,
        enableMetrics: false,
      },
      ...opts,
    });

    this.setTags({
      appId: this._manifest.id,
      appVersion: this._manifest.version,
      homeyVersion: this._homeyVersion,
      homeyPlatform: this._homeyPlatform,
      homeyPlatformVersion: this._homeyPlatformVersion,
    });

    // Get homey cloud id and set as tag
    this._managerCloud
      .getHomeyId()
      .then(homeyId => this.setTags({ homeyId }))
      .catch(err => Log._error('Error: could not get `homeyId`', err));

    Log._log(`App ${this._manifest.id} v${this._manifest.version} logging on Homey v${this._homeyVersion}...`);
    return this;
  }

  /**
   * Set `tags` that will be sent as context with every message or error. See the Sentry Node.js
   * documentation: https://docs.sentry.io/platforms/javascript/guides/node/enriching-events/tags/
   * @param {object} tags
   * @returns {Log}
   */
  setTags(tags) {
    Sentry.setTags(tags);
    return this;
  }

  /**
   * Set `user` that will be sent as context with every message or error. See the Sentry Node.js
   * documentation: https://docs.sentry.io/platforms/javascript/guides/node/enriching-events/identify-user/.
   * @param {object} user
   * @returns {Log}
   */
  setUser(user) {
    Sentry.setUser(user);
    return this;
  }

  /**
   * Create and send message event to Sentry. See the Sentry Node.js documentation:
   * https://docs.sentry.io/platforms/javascript/guides/node/usage/
   * @param {string} message - Message to be sent
   * @returns {Promise<string>|undefined}
   */
  async captureMessage(message) {
    Log._log('captureMessage:', message);

    if (this._capturedMessages.indexOf(message) > -1) {
      Log._log('Prevented sending a duplicate message');
      return;
    }

    this._capturedMessages.push(message);

    return new Promise((resolve, reject) => {
      try {
        resolve(Sentry.captureMessage(message));
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Create and send exception event to Sentry. See the sentry Node.js documentation:
   * https://docs.sentry.io/platforms/javascript/guides/node/usage/
   * @param {Error} err - Error instance to be sent
   * @returns {Promise<string>|undefined}
   */
  async captureException(err) {
    Log._log('captureException:', err);

    if (this._capturedExceptions.indexOf(err) > -1) {
      Log._log('Prevented sending a duplicate log');
      return;
    }

    this._capturedExceptions.push(err);

    return new Promise((resolve, reject) => {
      try {
        resolve(Sentry.captureException(err));
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Mimic SDK log method.
   * @private
   */
  static _log() {
    console.log.bind(null, Log._logTime(), '[homey-log]').apply(null, arguments);
  }

  /**
   * Mimic SDK error method.
   * @private
   */
  static _error() {
    console.error.bind(null, Log._logTime(), '[homey-log]').apply(null, arguments);
  }

  /**
   * Mimic SDK timestamp.
   * @returns {string}
   * @private
   */
  static _logTime() {
    return `\x1b[35m${new Date().toISOString()}\x1b[0m`;
  }

  /**
   * Whether logging is forced.
   * @returns {boolean}
   * @private
   */
  static _isLogForced() {
    switch (HomeyModule.env.HOMEY_LOG_FORCE) {
      case '1':
      case 'true':
        return true;
      default:
        return false;
    }
  }
}

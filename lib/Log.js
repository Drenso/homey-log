'use strict';

const Sentry = require('@sentry/node');
const HomeyModule = require('homey');

class Log {

  _capturedMessages = [];
  _capturedExceptions = [];

  /**
   * Construct a new Log instance.
   * @param {object} args
   * @param {HomeyModule} args.homey - `this.homey` instance in
   * your app (e.g. `App#homey`/`Driver#homey`/`Device#homey`).
   *
   * @param {object} [args.options] - Additional options for Sentry
   *
   * @example
   * class MyApp extends Homey.App {
   *   onInit() {
   *     this.homeyLog = new Log({ homey: this.homey });
   *   }
   * }
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

    this._manifest = HomeyModule.manifest;
    this._homeyVersion = homey.version;
    this._managerCloud = homey.cloud;

    // Init Sentry, pass enabled option to prevent sending events upstream when in debug mode
    this.init(HomeyModule.env.HOMEY_LOG_URL, { ...{ enabled: !disableSentry }, ...options });
  }

  /**
   * Init Sentry.
   * @param {string} dsn The Sentry DSN
   * @param {object} opts Options to be passed to the Sentry init
   * @returns {Log}
   * @private
   */
  init(dsn, opts) {
    Sentry.init({ ...{ dsn }, ...opts });

    this.setTags({
      appId: this._manifest.id,
      appVersion: this._manifest.version,
      homeyVersion: this._homeyVersion,
    });

    // Get homey cloud id and set as tag
    this._managerCloud.getHomeyId()
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

    // eslint-disable-next-line consistent-return
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

    // eslint-disable-next-line consistent-return
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
    // eslint-disable-next-line prefer-spread,prefer-rest-params,no-console
    console.log.bind(null, Log._logTime(), '[homey-log]').apply(null, arguments);
  }

  /**
   * Mimic SDK error method.
   * @private
   */
  static _error() {
    // eslint-disable-next-line prefer-spread,prefer-rest-params,no-console
    console.error.bind(null, Log._logTime(), '[homey-log]').apply(null, arguments);
  }

  /**
   * Mimic SDK timestamp.
   * @returns {string}
   * @private
   */
  static _logTime() {
    return `\x1b[35m${(new Date()).toISOString()}\x1b[0m`;
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

module.exports = Log;

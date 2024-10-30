# Homey Log

[![npm](https://img.shields.io/npm/v/@drenso/homey-log)](https://www.npmjs.com/package/@drenso/homey-log) [![NPM](https://github.com/Drenso/node-homey-log/actions/workflows/deploy.yml/badge.svg)](https://github.com/Drenso/node-homey-log/actions/workflows/deploy.yml) [![pages-build-deployment](https://github.com/Drenso/homey-log/actions/workflows/pages/pages-build-deployment/badge.svg?branch=master)](https://github.com/Drenso/homey-log/actions/workflows/pages/pages-build-deployment)

This module can be used in a Homey App to send events to [Sentry](http://sentry.io/).

## Documentation

Documentation is available at [https://drenso.github.io/homey-log](https://drenso.github.io/homey-log).

## Related Modules

* [node-homey-zwavedriver](https://athombv.github.io/node-homey-zwavedriver) — Module for Z-Wave drivers
* [node-homey-zigbeedriver](https://athombv.github.io/node-homey-zigbeedriver) — Module for Zigbee drivers
* [node-homey-rfdriver](https://athombv.github.io/node-homey-rfdriver) — Module for RF (433 Mhz, 868 MHz, Infrared) drivers
* [node-homey-oauth2app](https://athombv.github.io/node-homey-oauth2app) — Module for OAuth2 apps

## Installation

```bash
npm install --save @drenso/homey-log
```

## Getting started

In `env.json`, add the Sentry URL. If you would like to send the logs to Sentry *also* during development, set force log to `1`.

```json
{
  "HOMEY_LOG_FORCE": "0",
  "HOMEY_LOG_URL": "https://foo:bar@sentry.io/123456"
}
```

In `app.js`, include the library and create a new `Log` instance:

```js
const { Log } = require('homey-log');

class MyApp extends Homey.App {
  onInit() {
    this.homeyLog = new Log({ homey: this.homey });
  }
}
```

### Notes

* When your app crashes due to an `uncaughtException` or `unhandledRejection`, this will automatically be sent to Sentry.
* When running your app with `homey app run` events will not be sent to Sentry.

## Changelog

### 2.0.0

This version is only SDK version 3 compatible. It now requires a different way of setting up the `Log` instance, see _Getting Started_.

### 3.0.0

This version has replaced the raven SDK with [@sentry/node](https://docs.sentry.io/platforms/javascript/guides/node/) version 8. If you were using the basic configuration, nothing has changed.

  - If you were passing custom options, you will need to review them.
  - `setExtra` is deprecated by Sentry and has been removed.

### 8.*

This package will now follow the Sentry version included.

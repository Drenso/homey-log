'use strict';

const os = require('node:os');

if (!process.env.HOME) {
  // Sentry SDK requires the HOME env var to be set, which is not guaranteed on Homey
  process.env.HOME = os.tmpdir();
}

const Log = require('./lib/Log');

module.exports = { Log };

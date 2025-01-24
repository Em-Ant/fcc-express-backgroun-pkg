/******************************************************
 * console.log wrapper
 * to test 1) Hello World, 7) Logger middleware
 * ***************************************************/

const globals = require('./globals');
const Address4 = require('ip-address').Address4
const Address6 = require('ip-address').Address6

// Store a reference to the original console.log()
const log = console.log;

// Wrap console.log() to run a check everytime before it's used
console.log = function () {
  // Convert arguments into actual array.
  const args = Array.prototype.slice.call(arguments);

  // Check if this message solves any of the challenges that make use of console.log()
  testLogMessage(args);

  // Execute the original console.log() provided args
  log.apply(null, args);
};

// Verify if a log message solves the expected log for certain challenges
function testLogMessage(args) {
  let msg = '';
  try {
    // build the log string
    msg = args
      .map(function (arg) {
        return arg && arg.toString();
      })
      .join(' ');
  } catch (e) {
    log('log error - invalid arguments passed to console.log', e);
  }

  // Check if it solves the hello-console challenge.
  if (msg.toLowerCase().match(/^hello,?\sworld!?$/)) {
    globals.userPassedConsoleChallenge = true;
  }

  // Check if it solves the simple-middleware-logger challenge.
  const simpleLogSplit = msg.split("-");
  const ipAddress = simpleLogSplit[1];
  if (
    msg.match(/(GET|POST|PUT|DELETE|CONNECT|HEAD|OPTIONS|TRACE)\s\/.*\s\-/)
  ) {
    const v4Address = new Address4(ipAddress.trim())
    const v6Address = new Address6(ipAddress.trim())

    if (v4Address.isCorrect() || v6Address.isCorrect()) {
      globals.userPassedLoggerChallenge = true;
    }
  }
}

module.exports = log;

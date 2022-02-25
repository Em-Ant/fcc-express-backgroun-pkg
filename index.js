/******************************************************
 * PLEASE DO NOT EDIT THIS FILE
 * the verification process may break
 * ***************************************************/

'use strict';

const fs = require('fs');
const path = require('path');

const log = require('./wrappers');
const globals = require('./globals');

const http = require('http');
const https = require('https');
const selfCaller = function (path, req, res, cb) {
  const HOSTNAME = req.hostname;
  const PORT = req.get('host').split(':')[1];

  const prot = req.protocol === 'https' ? https : http;
  const opts = {
    hostname: HOSTNAME,
    method: 'GET',
    path: path,
    port: req.protocol === 'https' ? 443 : PORT || 80,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
    },
  };
  const rq = prot.request(opts, function (r) {
    r.on('data', (d) => {
      cb(d.toString(), req, res, r.headers);
    });
    r.on('error', () => {
      res.status(500).type('txt').send('SERVER ERROR');
    });
    r.resume();
  });
  rq.end();
};

const enableCORS = function (req, res, next) {
  if (!process.env.DISABLE_XORIGIN) {
    var allowedOrigins = [
      'https://narrow-plane.gomix.me',
      'https://www.freecodecamp.com',
    ];
    const origin = req.headers.origin;
    if (!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers':
          'Origin, X-Requested-With, Content-Type, Accept',
      });
    }
  }
  next();
};

function setupBackgroundApp(app, myApp, dirname) {
  app.set('trust proxy', true);
  app.use(enableCORS);
  app.get('/_api/hello-console', function (req, res) {
    res.json({ passed: globals.userPassedConsoleChallenge });
  });

  app.get('/_api/json', function (req, res, next) {
    const MESSAGE_STYLE = process.env.MESSAGE_STYLE;
    process.env.MESSAGE_STYLE = undefined;
    selfCaller('/json', req, res, function (lowerCase, req, res) {
      process.env.MESSAGE_STYLE = MESSAGE_STYLE;
      try {
        lowerCase = JSON.parse(lowerCase);
      } catch (e) {
        console.log(e);
        process.env.MESSAGE_STYLE = MESSAGE_STYLE;
        next(e);
      }
      res.json(lowerCase);
    });
  });

  app.get('/_api/use-env-vars', function (req, res, next) {
    const MESSAGE_STYLE = process.env.MESSAGE_STYLE;
    if (MESSAGE_STYLE !== 'uppercase') return res.json({ passed: false });

    let lowerCaseMessage, upperCaseMessage;
    delete process.env.MESSAGE_STYLE;

    selfCaller('/json', req, res, function (lowerCase, req, res) {
      try {
        lowerCaseMessage = JSON.parse(lowerCase).message;
      } catch (e) {
        console.log(e);
        next(e);
      }
      process.env.MESSAGE_STYLE = 'uppercase';
      selfCaller('/json', req, res, function (upperCase, req, res) {
        try {
          upperCaseMessage = JSON.parse(upperCase).message;
        } catch (e) {
          console.log(e);
          next(e);
        }
        process.env.MESSAGE_STYLE = MESSAGE_STYLE;
        if (
          lowerCaseMessage === 'Hello json' &&
          upperCaseMessage === 'HELLO JSON'
        ) {
          res.json({ passed: true });
        } else {
          res.json({ passed: false });
        }
      });
    });
  });

  const simpleLogCB = function (data, req, res) {
    res.json({ passed: globals.userPassedLoggerChallenge });
  };

  app.get('/_api/root-middleware-logger', function (req, res) {
    globals.userPassedLoggerChallenge = false;
    selfCaller('/json', req, res, simpleLogCB);
  });

  const routeTimeCB = function (data, req, res) {
    let timeObj;
    try {
      timeObj = JSON.parse(data);
    } catch (e) {
      return res.json({ time: 0 });
    }
    timeObj.stackLength = globals.nowRouteStackLength;
    res.json(timeObj);
  };

  app.get('/_api/chain-middleware-time', function (req, res) {
    selfCaller('/now', req, res, routeTimeCB);
  });

  app.get('/_api/add-body-parser', function (req, res) {
    res.json({ mountedAt: globals.bodyParserMountPosition });
  });

  app.get('/_api/files/*?', function (req, res, next) {
    // exclude .env
    if (req.params[0] === '.env') {
      return next({ status: 401, message: 'ACCESS DENIED' });
    }
    fs.readFile(path.join(dirname, req.params[0]), function (err, data) {
      if (err) {
        return next(err);
      }
      res.type('txt').send(data.toString());
    });
  });

  // (almost) safely mount the practicing app
  try {
    app.use('/', myApp);
    const stack = (myApp._router && myApp._router.stack) || [];
    const layers = stack.map((l) => l.name);

    // check if body-parser is mounted
    const BPmountPos = layers.indexOf('urlencodedParser');
    globals.bodyParserMountPosition = BPmountPos > -1 ? BPmountPos - 1 : 0;

    // check if cookie-parser is mounted
    const CPmountPos = layers.indexOf('cookieParser');
    globals.cookieParserMountPosition = CPmountPos > -1 ? CPmountPos - 1 : 0;

    // check if /now route has a middleware before the handler
    const nowRoute = stack.filter((l) => {
      if (l.route) {
        return l.route.path === '/now';
      }
      return false;
    });
    if (nowRoute.length > 0) {
      globals.nowRouteStackLength = nowRoute[0].route.stack.length;
    }
  } catch (e) {
    console.log(e);
  }

  // Error Handling
  app.use(function (err, req, res, next) {
    if (err) {
      return res
        .status(err.status || 500)
        .type('txt')
        .send(err.message || 'SERVER ERROR');
    }
  });

  // Not Found Handling
  app.use(function (req, res, next) {
    res.status(404).type('txt').send('Not Found');
  });
  return app;
}

exports.setupBackgroundApp = setupBackgroundApp;
exports.globals = globals;
exports.log = log;

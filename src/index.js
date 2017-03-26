require('ssl-root-cas').inject();
const config = require('../.http.header.inspect.config.json');
const request = require('request');
const moment = require('moment');
const os = require('os');
const fs = require('fs');
const path = require('path');
var fse = require('fs-extra');

console.log('PID: ', process.pid);

for (const httpRequest of config.requests) {
  try {
    validateRequest(httpRequest);
  }
  catch (e) {
    console.log(`Validation failed with "${e}" so program must terminate.`);
    process.exit();
  }
}

process.stdin.resume();
process.on('SIGINT', function () {
  clearTimers(config.requests);
  closeAllFileDescriptors(config.requests);
  process.exit();
});

for (const httpRequest of config.requests) {
  setDefaults(httpRequest);
  httpRequest.timer = sendRequest(httpRequest);
  setupTimer(httpRequest);
}

function setDefaults(configRequest) {
  if (configRequest.strictSSL) {
    configRequest.strictSSL = false;
  }
  if (!isBoolean(configRequest.caching)) {
    configRequest.caching = true;
  }
  if (!isInt(configRequest.waitBetweenRequestInSeconds)) {
    configRequest.waitBetweenRequestInSeconds = 60;
  }
  if (configRequest.logRequests !== undefined) {
    for (const log of configRequest.logRequests) {

      if (!isBoolean(log.logToConsole)) {
        log.logToConsole = true;
      }

      if (log.headers === undefined) {
        log.headers = ['all'];
      }

      if (log.logFileRequest) {
        if (!isBoolean(log.logFileRequest.log)) {
          configRequest.logRequests.logFileRequest.log = true;
        }

        if (isNullOrWhitespaces(log.logFileRequest.path)) {
          configRequest.logRequests.logFileRequest.path = './log';
        }

        if (isNullOrWhitespaces(log.logFileRequest.fileName)) {
          log.fileName = 'AllHeaders.log';
        }

        if (isNullOrWhitespaces(log.logFileRequest.fileName)) {
          log.logFileRequest.preAppendDateFormat = 'preAppendDateFormat';
        }
      }
    }
  }
}

function validateRequest(configRequest) {
  if (isNullOrWhitespaces(configRequest.name)) {
    throw 'Configuration request must have a name.';
  }

  const name = configRequest.name;

  if (isNullOrWhitespaces(configRequest.url)) {
    throw `Configuration ${name} must have property url.`;
  }
}

function isNullOrWhitespaces(s) {
  return !s || s.trim() === '';
}

function isBoolean(bool) {
  return bool !== null && (typeof bool === 'boolean' ||
    (typeof bool === 'object' && typeof bool.valueOf() === 'boolean'));
}

function isInt(i) {
  return !isNaN(i) &&
    parseInt(Number(i)) == i &&
    !isNaN(parseInt(i));
}

function sendRequest(configRequest) {
  let headers = configRequest.requestHeaders;
  if (configRequest.responseHeaders !== undefined
    && configRequest.headersToResend !== undefined) {
    for (const header in configRequest.responseHeaders) {
      if (configRequest.headersOnResend.includes(header)) {
        headers[header] = configRequest.responseHeaders[header];
      }
    }
  }

  if (configRequest.caching
    && configRequest.responseHeaders !== undefined
    && configRequest.responseHeaders['etag'] !== undefined
    && configRequest.responseHeaders['last-modified'] !== undefined) {
    headers['If-None-Match'] = configRequest.responseHeaders['etag'];
    headers['If-Modified-Since'] = configRequest.responseHeaders['last-modified'];
  } else if (!configRequest.caching) {
    headers['Pragma'] = 'no-cache';
    headers['Cache-Control'] = 'no-cache';
  }

  request
    .get({
      url: configRequest.url,
      strictSSL: configRequest.strictSSL,
      headers
    }).on('response', function (response) {
      configRequest.responseHeaders = response.headers;
      for (const fileRequest of configRequest.logRequests) {
        logEntry(configRequest.name, response.statusCode, response.headers, fileRequest);
      }
    }).on('error', function (e) {
      console.log(`Error from server: ${e.message}`);
    });
}

function setupTimer(request) {
  const delay = 1000 * parseInt(request.waitBetweenRequestInSeconds);
  return setInterval(function (request) {
    sendRequest(request);
  }, delay, request);
}

function clearTimers(requests) {
  for (const request of requests) {
    clearInterval(request.timer);
  }

}

function logEntry(name, status, responseHeaders, logRequest) {
  const allHeadersToLog = logRequest.headers.map(h => h.toLowerCase());
  const headers = Object.keys(responseHeaders);

  var logEntry = moment().format('YYYY:MM:DD:HH:ss:SSSS');
  logEntry = logEntry.concat(` | name:"${name}" | status:${status}`);
  if (allHeadersToLog.includes('all')) {
    for (const h in headers) {
      logEntry = logEntry.concat(` | ${headers[h]}:${responseHeaders[headers[h]]}`);
    }
  } else {
    for (const header of headers) {
      if (allHeadersToLog.includes(header)) {
        logEntry = logEntry.concat(` | ${header}:${responseHeaders[header]}`);
      }
    }
  }

  if (logRequest.logToConsole) {
    console.log(logEntry);
  }

  if (logRequest.logFileRequest.log) {
    logEntry = logEntry.concat(os.EOL);

    getFileDescriptor(logRequest.logFileRequest);
    fs.write(logRequest.logFileRequest.fileDescriptor, logEntry, function (err) {
      if (err) {
        return console.log(err);
      }
    });
  }
}

function getFileDescriptor(logFileRequest) {
  if (logFileRequest.fileDescriptor == undefined) {
    let fileName = undefined;

    if (logFileRequest.preAppendDateFormat !== undefined) {
      try {
        const datePartOfFileName = new moment().format(logFileRequest.preAppendDateFormat);
        fileName = datePartOfFileName.concat(logFileRequest.fileName);
      } catch (e) {
        console.log(`${logFileRequest.preAppendDateFormat} is not a date time format.`);
        fileName = logFileRequest.fileName;
      }

    } else {
      fileName = logFileRequest.fileName;
    }

    fse.ensureDirSync(logFileRequest.path);

    const fullPath = path.join(logFileRequest.path, fileName);
    logFileRequest.fileDescriptor = fs.openSync(fullPath, 'w+');
  }
}

function closeAllFileDescriptors(requests) {
  for (const request of requests) {
    for (const lr of request.logRequests.filter(lr => lr.logFileRequest.fileDescriptor !== undefined)) {
      fs.closeSync(lr.logFileRequest.fileDescriptor);
    }
  }
}


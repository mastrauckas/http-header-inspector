# http-header-inspector utility

http-header-inspector is a utility that allows you to inspect http header traffic for a page.  To use http-header-inspector you must have a .http.header.inspect.config.json to configure the utility.

Some of the utilities parameters for each request are:
* **name:** The name you want to give a request configuration.  This is a _required_ field.
* **url:** The page you wanto inspect. This is a _required_ field.
* **strictSSL:** If https should use strict mode.  The default is _true_.
* **waitBetweenRequestInSeconds:** Time to delay between request.  The default is _60 seconds_.
* **caching:** Do you want to use http caching like etag.  The default is _true_.
* **requestHeaders object:** Is a object of which headers should be sent in with the request. The default is _no headers_.
* **logRequests array:** An array of objects loggers on how to log the request.
  * **logRequests.logToConsole:** Should this logger log to the console.  The default is _true_.
  * **logRequests.headers:** What headers this logger should log.  The default is _all_ which means log all response headers.
  * **logRequests.logFileRequest:** A file request object logger to tell how to log to the file system.  The default is _is does not log to the file system_.
    
       * **logRequests.logFileRequest.log:** Should this object log.  The default is _true_.
       * **logRequests.logFileRequest.path:** Where to put the log file.  The default is _./log_.
       * **logRequests.logFileRequest.fileName:** File name to use.  The default is _AllHeaders.log_.
       * **logRequests.logFileRequest.preAppendDateFormat:** Date to pre append to the file name.  The default is _YYYYMMDDHHssSSSS_.

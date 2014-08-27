/*global setImmediate:true, setTimeout, clearTimeout*/

// node 0.8 compat
if (typeof setImmediate === 'undefined') {
    setImmediate = process.nextTick;
}

var BufferedStream = require('bufferedstream'),
    _ = require('underscore'),
    expect = require('unexpected');

module.exports = function createMockRequest(requestDescriptions) {
    if (!Array.isArray(requestDescriptions)) {
        if (typeof requestDescriptions === 'undefined') {
            requestDescriptions = [];
        } else {
            requestDescriptions = [requestDescriptions];
        }
    }

    var nextRequestDescriptionIndex = 0;

    function mockRequest(options, cb) {
        if (typeof options === 'string') {
            options = {url: options};
        }
        setImmediate(function () {
            expect(mockRequest.getNumberOfRemainingExchanges(), 'to be greater than', 0);
            var requestDescription = requestDescriptions[nextRequestDescriptionIndex];
            nextRequestDescriptionIndex += 1;
            var requestProperties = requestDescription.request;
            if (typeof requestProperties === 'string') {
                requestProperties = {url: requestProperties};
            }
            if (requestProperties && typeof requestProperties.url === 'string') {
                var matchMethod = requestProperties.url.match(/^([A-Z]+) ([\s\S]*)$/);
                if (matchMethod) {
                    requestProperties.method = requestProperties.method || matchMethod[1];
                    requestProperties.url = matchMethod[2];
                }
            }

            if (requestProperties) {
                expect(options, 'to have properties', requestProperties);
            }
            var responseProperties = requestDescription.response;

            if (responseProperties && Object.prototype.toString.call(responseProperties) === '[object Error]') {
                return cb(responseProperties);
            }
            if (typeof responseProperties === 'number') {
                responseProperties = {statusCode: responseProperties};
            } else if (Buffer.isBuffer(responseProperties) || typeof responseProperties === 'string' || (responseProperties && typeof responseProperties.pipe === 'function')) {
                responseProperties = {body: responseProperties};
            }
            if (typeof responseProperties.statusCode === 'undefined') {
                responseProperties.statusCode = 200;
            }

            var response,
                body = responseProperties.body;

            delete responseProperties.body;

            response = new BufferedStream();

            var ended = false;
            function onTimeout() {
                if (!ended) {
                    ended = true;
                    var err = new Error('ETIMEDOUT');
                    err.code = 'ETIMEDOUT';
                    response.emit('error', err);
                }
            }
            var timeoutId;
            function setUpOrRenewTimeout() {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                if (responseProperties.timeout) {
                    timeoutId = setTimeout(onTimeout, responseProperties.timeout);
                }
            }

            if (body && typeof body.pipe === 'function') {
                setUpOrRenewTimeout();

                body.pipe(response);
                body
                    .once('error', function (err) {
                        if (!ended || !responseProperties.timeout) {
                            ended = true;
                            if (timeoutId) {
                                clearTimeout(timeoutId);
                            }
                            response.emit('error', err);
                        }
                    })
                    .once('end', function () {
                        if (!ended || !responseProperties.timeout) {
                            ended = true;
                            if (timeoutId) {
                                clearTimeout(timeoutId);
                            }
                        }
                    })
                    .on('data', function () {
                        setUpOrRenewTimeout();
                    });
            } else {
                if (Array.isArray(body)) {
                    body.forEach(function (chunk) {
                        response.write(chunk);
                    });
                    response.end();
                } else {
                    if (typeof body === 'object' && body && !Buffer.isBuffer(body)) {
                        _.extend(response, body);
                        body = JSON.stringify(body);
                    }
                    response.end(body);
                }
            }

            delete responseProperties.body;

            _.extend(response, responseProperties);
            // Lower-case the response headers:
            var headers = response.headers || {};
            response.headers = {};
            Object.keys(headers).forEach(function (headerName) {
                response.headers[headerName.toLowerCase()] = headers[headerName];
            });
            cb(null, response, body);
        });
    }

    mockRequest.getNumberOfRemainingExchanges = function () {
        return requestDescriptions.length - nextRequestDescriptionIndex;
    };

    ['get', 'post', 'put', 'delete'].forEach(function (method) {
        mockRequest[method] = function (options, cb) {
            if (typeof options === 'string') {
                options = {url: options};
            }
            options.method = method.toUpperCase();
            return mockRequest(options, cb);
        };
    });

    return mockRequest;
};

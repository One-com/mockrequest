node-mockrequest
================

A mock version of the request module for use in tests. It "plays back" a sequence of request/response pairs that you specify up front.

[![NPM version](https://badge.fury.io/js/mockrequest.png)](http://badge.fury.io/js/mockrequest)
[![Build Status](https://travis-ci.org/One-com/mockrequest.png)](https://travis-ci.org/One-com/mockrequest)
[![Coverage Status](https://coveralls.io/repos/One-com/mockrequest/badge.png)](https://coveralls.io/r/One-com/mockrequest)
[![Dependency Status](https://david-dm.org/One-com/mockrequest.png)](https://david-dm.org/One-com/mockrequest)

Usage
-----

```javascript
var MockRequest = require('mockrequest'),
    request = new MockRequest({
        request: {
            method: 'GET',
            url: '/foo'
        },
        response: {
            headers: {
                'Content-Type': 'text/html'
            },
            body: '<p>Hello!</p>'
        }
    });

request.get('/foo', function (err, response, body) {
    // response.statusCode === 200
    // response.headers['content-type'] === 'text/html'
    // body === '<p>Hello!</p>';
});
```

Requests can be specified either as a string (interpreted as a url with an
optional method before it) or an object, which can have `method`, `url`,
`headers`, and `body` properties. The request body can be provided as either a
string or a `Buffer` instance.

Responses can be specified as either a number (status code), a string or
Buffer (the body), or an object with `headers`, `statusCode`, and `body`
properties. The response body can be specified as either a string, a `Buffer`
instance. Support for readable streams is being worked on.

For your convenience, request and response headers can be specified in any
casing. They will be normalized to the lower-case form.

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */
var app;

if (process.argv.length === 3 && process.argv[2] === 'beta')  {
    app = require('./app.v2');
} else {
    app = require('./app');
}

var port = process.env.PORT ? process.env.PORT : 3000;
var hostname = require('os').hostname();

if (module.parent) {
    module.exports = app;
} else {
    app.listen(port, function () {
        console.log('listening at %s port %s', hostname, port);
    });
}

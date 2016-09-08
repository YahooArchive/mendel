var tap = require('tap');
var sut = require('../packages/mendel-development-middleware');

var express = require('express');
var request = require('request');
var path = require('path');
var async = require('async');

var app = express();
app.use(sut({
    basedir: path.join(__dirname, './app-samples/1/')
}));

var server = app.listen('1337');
var host = 'http://localhost:1337';
var appBundle = host+'/mendel/app/app.js';
tap.tearDown(function() {
    server.close(process.exit);
});

tap.test('mendel-development-middleware serves a bundle', function(t){
    t.plan(2);

    request(appBundle, function(error, response, body) {
        if (error) t.bailout(error);

        t.match(response, {
            statusCode: 200,
            headers: { 'content-type': 'application/javascript' }
        }, 'serves javascript');
        t.contains(body, 'sourceMappingURL=data:application/json;',
            'has source maps');
    });
});

tap.test('serves cached bundles', function(t) {
    t.plan(1);

    function getVendor(done) {
        request(appBundle, function(error) {
            done(error);
        });
    }

    // this would cause test to timeout if cache is disabled
    var requests = [];
    for (var i = 0; i < 1000; i++) {
        requests.push(getVendor);
    }
    async.series(requests, function(error) {
        if (error) t.bailout(error);

        t.pass('got 1000 of the same bundle');
    });
});

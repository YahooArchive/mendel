var tap = require('tap');
var sut = require('../packages/mendel-development-middleware');

var express = require('express');
var request = require('request');
var path = require('path');

var app = express();
app.use(sut({
    basedir: path.join(__dirname, './config-samples')
}));

var server = app.listen('1337');
var host = 'http://localhost:1337';
tap.tearDown(function() {
    server.close(process.exit);
});

tap.test('mendel-development-middleware', function(t){
    t.plan(1);

    var vendor = host+'/mendel/name_for_base_variation/vendor.js';
    request(vendor, function(error) {
        if (error) t.bail(error);

        t.pass('serves javascript');
    });
});

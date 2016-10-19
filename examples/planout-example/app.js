/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var ReactDOMServer = require('react-dom/server');
var express = require('express');
var logger = require('morgan');
var MendelMiddleware = require('mendel-middleware');
var uuid = require("node-uuid");
var PlanoutAssignment = require("./PlanoutAssignment");
var cookieParser = require('cookie-parser');
if (process.env.NODE_ENV !== 'production') {
    MendelMiddleware = require('mendel-development-middleware');
}

var app = express();
app.use(logger('tiny'));
app.use(MendelMiddleware());
app.set('query parser', 'simple');
app.use(cookieParser());

// set visitorId for Planout Assignment
app.use(`*`, function (req, res, next) {
    if(req.cookies && req.cookies.visitorId && !req.query.reset){
        req.visitorId = req.cookies.visitorId;
    }
    else{
        req.visitorId = uuid.v4(); // create new userId
    }
    // set or reset the cookie
    res.cookie(
        'visitorId',
        req.visitorId,
        {
            httpOnly: false,
            maxAge: 3600 * 1000 * 24 * 365 * 2
        }
    )
    next();
});

app.get('/', function(req, res) {

    var variations = [];
    if(req.query.variations){
        variations = (req.query.variations||'').trim()
        .split(',').filter(Boolean);
    }
    else{
        var assignments = new PlanoutAssignment({
            visitorId: req.visitorId
        }).getParams();
        variations = [assignments.layer_1, assignments.layer_2].filter(Boolean);
    }

    var serverRender = req.query.ssr !== 'false' && req.mendel.isSsrReady();
    var optionalMarkup = "";

    if (serverRender) {
        // To improve ssr performance, you need to pass
        // array of bundle ids you only need for ssr rendering
        var resolver = req.mendel.resolver(['main'], variations);
        var Main = resolver.require('main.js');

        optionalMarkup = ReactDOMServer.renderToString(Main())
    }

    var html = [
        '<!DOCTYPE html>',
        '<html><head></head><body>',
            '<div id="main">'+optionalMarkup+'</div>',
            bundle(req, 'vendor', variations),
            bundle(req, 'main', variations),
        '</body></html>'
    ].join('\n');

    res.send(html);
    res.end();
});

function bundle(req, bundle, variations) {
    var url = req.mendel.getURL(bundle, variations);
    return '<script src="'+url+'"></script>';
}

module.exports = app;

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var ReactDOMServer = require('react-dom/server');
var express = require('express');
var logger = require('morgan');
var MendelMiddleware = require('mendel-middleware');
if (process.env.NODE_ENV !== 'production') {
    MendelMiddleware = require('mendel-development-middleware');
}

var app = express();
app.use(logger('tiny'));
app.use(MendelMiddleware());
app.set('query parser', 'simple');

app.get('/', function(req, res) {
    var variations = (req.query.variations||'').trim()
    .split(',').filter(Boolean);
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
            // The full example supports on-demand loading, lazy bundle
            // is only loaded client-side when a button is clicked in the
            // application
            entryMap(req, 'lazy', variations),
        '</body></html>'
    ].join('\n');

    res.send(html);
    res.end();
});

function bundle(req, bundle, variations) {
    var url = req.mendel.getURL(bundle, variations);
    return '<script src="'+url+'"></script>';
}

function entryMap(req, bundle, variations) {
    // req.mendel.getBundleEntries contains all bundles as keys and array of
    // entries that were used and normalized by variations, this allows apps
    // to create specific logic with their bundles in runtime
    var bundles = req.mendel.getBundleEntries();

    // In this particular case, entryMap will be used to expose to the client
    // the URL for bundles based on modules that are "exposed", meaning, after
    // loading the bundle, you can `require('entryName.js')` for any entry.
    var entryMapScript =  [
        '<script>',
        '   (function(){',
        '       var nameSpace = "_mendelEntryMap";',
        '       var url = "'+req.mendel.getURL(bundle, variations)+'";',
        '       window[nameSpace] = window[nameSpace] || {};',
        '       ' + bundles[bundle].map(function(entry) {
                    return 'window[nameSpace]["'+entry+'"] = ' + ' url;';
                }).join('\n       '),
        '   })()',
        '</script>'
    ];
    return entryMapScript.join('\n');
}

module.exports = app;

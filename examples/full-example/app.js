/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */
var ReactDOMServer = require('react-dom/server');
var express = require('express');
var logger = require('morgan');
var MendelMiddleware = require('mendel-middleware');
var cache = true;

if (process.env.NODE_ENV !== 'production') {
    MendelMiddleware = require('mendel-development-middleware');
    cache = false;
}

if (String(process.env.MENDEL_CACHE) === 'false') {
    cache = false;
}

var app = express();
app.use(logger('tiny'));
app.use(MendelMiddleware());
app.set('query parser', 'simple');

app.get('/', function(req, res) {
    var variations = (req.query.variations || '')
        .trim()
        .split(',')
        .filter(Boolean);
    var serverRender = req.query.ssr !== 'false' && req.mendel.isSsrReady();
    var optionalMarkup = '';

    // populates req.mendel.variations with validated and sorted variations
    req.mendel.setVariations(variations);

    if (serverRender) {
        // To improve ssr performance, you need to pass
        // array of bundle ids you only need for ssr rendering
        const resolver = req.mendel.resolver(['main']);
        var Main = resolver.require('./main');
        optionalMarkup = ReactDOMServer.renderToString(Main());
    }

    var html = [
        '<!DOCTYPE html>',
        '<head>',
        bundle(req, 'css'),
        '</head>',
        '<body>',
        '<div id="main">' + optionalMarkup + '</div>',
        bundle(req, 'vendor'),
        bundle(req, 'main'),
        // The full example supports on-demand loading, lazy bundle
        // is only loaded client-side when a button is clicked in the
        // application
        entryMap(req, 'lazy'),
        '</body>',
    ].join('\n');

    res.send(html);
    res.end();
});

// Simple caching added to example, since very large applications can experience
// overhead added by mendel hashing bundles.
// Caching is not part of the middleware itself because large deployments with
// dozens or hundreds of nodejs processes will prefer distributed caches such as
// memcached, redis, etc
var bundleCache = {};
var entryMapCache = {};

function bundle(req, bundle) {
    var key = bundle + ':' + req.mendel.variations.join(':');
    if (!cache || !bundleCache[key]) {
        if (bundle === 'css') {
            if (Boolean(process.env.INLINE_CSS) === true) {
                bundleCache[key] =
                    '<style>' + concatDeps(req, bundle) + '</style>';
            } else {
                bundleCache[key] =
                    '<link rel="stylesheet" type="text/css" href="' +
                    req.mendel.getURL(bundle) +
                    '">'; // eslint-disable-line max-len
            }
        } else {
            bundleCache[key] =
                '<script src="' + req.mendel.getURL(bundle) + '"></script>';
        }
    }
    return bundleCache[key];
}

function entryMap(req, bundle) {
    var key = bundle + ':' + req.mendel.variations.join(':');
    if (!cache || !entryMapCache[key]) {
        // `req.mendel.getBundleEntries` contains all bundles as keys and arrays
        // of entries that were used (normalized by variations) as values. This
        // allows apps to create a specific logic with their bundles in the
        // runtime.
        var bundles = req.mendel.getBundleEntries(bundle);

        // In this particular case, entryMap will be used to expose to the client
        // the URL for bundles based on modules that are "exposed", meaning, after
        // loading the bundle, you can `require('entryName.js')` for any entry.
        var entryMapScript = [
            '<script>',
            '   (function(){',
            '       var nameSpace = "_mendelEntryMap";',
            '       var url = "' + req.mendel.getURL(bundle) + '";',
            '       window[nameSpace] = window[nameSpace] || {};',
            '       ' +
                bundles
                    .map(function(entry) {
                        return (
                            'window[nameSpace]["' + entry + '"] = ' + ' url;'
                        );
                    })
                    .join('\n       '),
            '   })()',
            '</script>',
        ];
        entryMapCache[key] = entryMapScript.join('\n');
    }
    return entryMapCache[key];
}

function concatDeps(req, bundleId) {
    const bundle = req.mendel.getBundle(bundleId);

    return bundle.deps.map(dep => dep.source).join('\n');
}

module.exports = app;

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
        var resolver = req.mendel.resolver(variations);
        var Main = resolver.require('main.js');

        optionalMarkup = ReactDOMServer.renderToString(Main())
    }

    var html = [
        '<!DOCTYPE html>',
        '<html><head></head><body>',
            '<div id="main">'+optionalMarkup+'</div>',
            bundle(req, 'vendor', variations),
            bundle(req, 'main', variations),
            // WARNING: This temporary "lazy" bundle is not part of the example
            // The dev team needs this here for a while in order to
            // do some work in parallel branches
            entryMap(req, 'temporary', variations),
            // END WARNING
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
    // to do their specific logic with their bundles
    var bundles = req.mendel.getBundleEntries();

    // In this particular case, we used "temporary" on the .mendelrc
    // go expose our lazy bundle entries from extractify
    var lazy =  [
        '<script>',
        '   (function(){',
        '       var nameSpace = "_extractedModuleBundleMap";',
        '       var url = "'+req.mendel.getURL(bundle, variations)+'";',
        '       window[nameSpace] = window[nameSpace] || {};',
        '       ' + bundles[bundle].map(function(entry) {
                    return 'window[nameSpace]["'+entry+'"] = ' + ' url;';
                }).join('\n       '),
        '   })()',
        '</script>'
    ];
    return lazy.join('\n');
}

module.exports = app;

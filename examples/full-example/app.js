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
            bundle(req, 'lazy', variations),
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

module.exports = app;

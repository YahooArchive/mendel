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

    var exposed = req.mendel.getExposed(variations);
    var depBundleMap = Object.keys(exposed).reduce(function(acc, bundle) {
        exposed[bundle].deps.forEach(function(dep) {
            acc[dep.expose] = exposed[bundle].path;
        });
        return acc;
    }, {});

    var html = [
        '<!DOCTYPE html>',
        '<html><head>',
       '<script>window.exposedDeps=',
        JSON.stringify(depBundleMap),
        ';</script>',
        '</head><body>',
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

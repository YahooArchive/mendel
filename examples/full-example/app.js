var ReactDOMServer = require('react-dom/server');
var express = require('express');
var logger = require('morgan');
var MendelMiddleware = require('mendel-production-middleware');
if (process.env.NODE_ENV !== 'production') {
    MendelMiddleware = require('mendel-middleware');
}

var app = express();
app.use(logger('tiny'));
app.use(MendelMiddleware());
app.set('query parser', 'simple');

app.get('/', function(req, res) {
    var variations = (req.query.variations||'').trim()
    .split(',').filter(Boolean);

    var resolver = req.mendel.resolver('main', variations);

    var Main = resolver.require('main.js');

    var html = [
        '<!DOCTYPE html>',
        '<html><head></head><body>',
            '<div id="main">',
                ReactDOMServer.renderToString(Main()),
            '</div>',
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

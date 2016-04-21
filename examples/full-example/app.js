var express = require('express');
var logger = require('morgan');
var bpack = require('browser-pack');

var app = express();
app.use(logger('tiny'));
app.set('query parser', 'simple');

var MendelTrees = require('mendel');
var trees = MendelTrees();

app.get('/', function(req, res) {
    var variations = (req.query.variations||'').trim()
    .split(',').filter(Boolean);

    var vendortree = trees.findTreeForVariations('vendor', variations);
    var maintree = trees.findTreeForVariations('main', variations);

    var html = [
        '<!DOCTYPE html>',
        '<html><head></head><body>',
            '<div id="app">',
            '</div>',
            bundle('vendor', vendortree.hash),
            bundle('main', maintree.hash),
        '</body></html>'
    ].join('\n');

    res.send(html);
    res.end();
});

function bundle(bundle, hash) {
    return '<script src="/'+hash+'/'+bundle+'.js"></script>';
}

app.get('/:hash/:bundle.js', function(req, res) {
    var bundle = req.params.bundle;
    var hash = req.params.hash;
    var decodedResults = trees.findTreeForHash(bundle, hash);
    var pack = bpack({raw: true, hasExports: true});
    pack.pipe(res);
    decodedResults.deps.forEach(function(dep) {
        pack.write(dep);
    });
    pack.end();
});

module.exports = app;

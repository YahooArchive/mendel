
var pathToRegexp = require('path-to-regexp');
var bpack = require('browser-pack');
var MendelTrees = require('./lib/trees');

module.exports = MendelMiddleware;

function MendelMiddleware(opts) {
    var trees = MendelTrees(opts);

    var route = trees.config.hashroute || '/mendel/:hash/:bundle.js';
    var getPath = pathToRegexp.compile(route);
    var keys = [];
    var bundleRoute = pathToRegexp(route, keys);

    return function(req, res, next) {
        req.mendel = req.mendel || {};

        req.mendel.getURL = function(bundle, variations) {
            var tree = trees.findTreeForVariations(bundle, variations);
            return getPath({bundle:bundle, hash: tree.hash});
        };

        // Match bundle route
        var reqParams = bundleRoute.exec(req.url);
        if (!reqParams) {
            return next();
        }
        var params = namedParams(keys, reqParams);
        if (!(
            params.bundle &&
            params.hash &&
            trees.config.bundles[params.bundle]
        )) {
            return next();
        }

        // Serve bundle
        var pack = bpack({raw: true, hasExports: true});
        var decodedResults = trees.findTreeForHash(params.bundle, params.hash);
        pack.pipe(res);
        decodedResults.deps.forEach(function(dep) {
            pack.write(dep);
        });
        pack.end();
    };
}

function namedParams(keys, reqParams) {
    return keys.reduce(function(params, param, index) {
        params[param.name] = reqParams[index+1];
        return params;
    }, {});
}

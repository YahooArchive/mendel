
var pathToRegexp = require('path-to-regexp');
var bpack = require('browser-pack');
var MendelTrees = require('mendel-core/trees');
var MendelLoader = require('mendel-loader');

module.exports = MendelMiddleware;

function MendelMiddleware(opts) {
    var trees = MendelTrees(opts);

    var route = trees.config.hashroute || '/mendel/:hash/:bundle.js';
    var getPath = pathToRegexp.compile(route);
    var keys = [];
    var bundleRoute = pathToRegexp(route, keys);
    var bundles = trees.config.bundles.reduce(function(acc, bundle) {
        acc[bundle.id] = bundle;
        return acc;
    }, {});
    var loader = new MendelLoader(trees, {
        parentModule: module.parent
    });

    return function(req, res, next) {
        req.mendel = req.mendel || {};

        req.mendel.getURL = function(bundle, variations) {
            var tree = trees.findTreeForVariations(bundle, variations);
            return getPath({ bundle: bundle, hash: tree.hash });
        };

        req.mendel.resolver = loader.resolver.bind(loader);
        req.mendel.isSsrReady = loader.isSsrReady.bind(loader);

        // Match bundle route
        var reqParams = bundleRoute.exec(req.url);
        if (!reqParams) {
            return next();
        }
        var params = namedParams(keys, reqParams);
        if (!(
            params.bundle &&
            params.hash &&
            bundles[params.bundle]
        )) {
            return next();
        }

        // Serve bundle
        res.header('content-type', 'application/javascript');
        var pack = bpack({raw: true, hasExports: true});
        var decodedResults = trees.findTreeForHash(params.bundle, params.hash);
        if (!decodedResults || decodedResults.error) {
            return notFound(res, decodedResults && decodedResults.error);
        }
        pack.pipe(res);
        decodedResults.deps.forEach(function(dep) {
            pack.write(dep);
        });
        pack.end();
    };
}

function notFound(res, error) {
    var message = "Mendel: ";
    if (!error) {
        message += 'Bundle not found';
    } else {
        message += error.code + ' - ' + error.message;
    }
    res.status(404).send(message);
}

function namedParams(keys, reqParams) {
    return keys.reduce(function(params, param, index) {
        params[param.name] = reqParams[index+1];
        return params;
    }, {});
}

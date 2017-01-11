const pathToRegExp = require('path-to-regexp');
const parseConfig = require('mendel-config');
const resolveVariations = require('mendel-development/resolve-variations');
const MendelClient = require('mendel-pipeline/client');
const Stream = require('stream');
const variationalExec = require('./exec');

module.exports = MendelMiddleware;

function MendelMiddleware(opts) {
    const client = new MendelClient(Object.assign({}, opts, {noout: true}));
    client.run();
    const config = parseConfig(opts);
    const {variations} = config.variationConfig;
    const route = config.routeConfig.variation || '/mendel/:variations/:bundle\.js';
    const getPath = pathToRegExp.compile(route);
    const keys = [];
    // Populates the key with name of the path variables
    // i.e., "variations", "bundle"
    const bundleRoute = pathToRegExp(route, keys);
    const bundles = new Set();
    config.bundles.forEach(bundle => bundles.add(bundle.id));

    return function(req, res, next) {
        req.mendel = req.mendel || {variations: false};
        req.mendel.getBundleEntries = function getBundleEntries() {
            return {};
        };

        req.mendel.setVariations = function setVariations(variations) {
            if (req.mendel.variations === false) {
                req.mendel.variations = variations;
            }
            return req.mendel.variations;
        };

        req.mendel.getURL = function getURL(bundleId) {
            const variations = req.mendel.variations.join(',') ||
                config.baseConfig.id;
            return getPath({bundle: bundleId, variations});
        };

        req.mendel.require = function mendelRequire(entryId, variation) {
            variation = variation || config.baseConfig.dir;
            return variationalExec(client.registry, entryId, variation);
        };

        req.mendel.isSsrReady = () => client.isSynced();

        // Match bundle route
        const reqParams = bundleRoute.exec(req.url);
        // If it is not a bundle route, move on to next so application
        // can do SSR or whatever
        if (!reqParams) return next();

        // This is a bundle route. Return a bundle and end
        const params = namedParams(keys, reqParams);
        if (!params.bundle || !bundles.has(params.bundle)) return next();

        const vars = resolveVariations(
            variations,
            // %2C is comma done in getURL above
            (params.variations || []).split(/(,|%2C)/i)
        );
        // If params.variations does not exist or it does not resolve to
        // proper chain.
        if (!vars.length) return next();

        // Serve bundle
        // req.accepts cannot be used since JS request accepts "*.*"
        if (req.headers.accept.indexOf('text/css') >= 0) {
            res.header('content-type', 'text/css');
        } else {
            res.header('content-type', 'application/javascript');
        }

        client.build(params.bundle, vars)
        .then(bundle => {
            if (bundle instanceof Stream) return bundle.pipe(res);
            else if (typeof bundle === 'string') return res.send(bundle).end();

            console.error(
                'Mendel client build is imcompatible with middleware.',
                'Bundle: ' + params.bundle,
                'Output was of type: ' + typeof bundle
            );

            res.status(500)
            .send('console.error("Error compiling client bundle. Please check Mendel output")') // eslint-disable-line max-len
            .end();
        })
        .catch(e => {
            console.error(e.stack);
            res.status(500)
            .send('console.error("Error compiling client bundle",' + JSON.stringify({stack: e.stack}, null, 2) + ')') // eslint-disable-line max-len
            .end();
        });
    };
}

function namedParams(keys, reqParams) {
    return keys.reduce((params, param, index) => {
        params[param.name] = reqParams[index + 1];
        return params;
    }, {});
}

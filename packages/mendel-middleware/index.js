
var express = require('express');



var parseConfig = require('./lib/config');
var validVariations = require('./lib/variations');



module.exports = MendelMiddleware;

function MendelMiddleware(opts) {
    var router = express.Router();
    var config = parseConfig(opts);
    var existingVariations = validVariations(config);
    var base = config.base || 'base';
    var path = '/mendel/:variations/:bundle\.js' || opts.path;

    existingVariations = existingVariations.concat({
        id: base,
        chain: [config.basetree || 'base'],
    })

    return router.get(path, function(req, res, next) {
        var variations = (req.params.variations||'').split(',').concat(base);
        var bundle = req.params.bundle;

        var bundleConfig = config.bundles[bundle];
        var dirs = resolveVariations(existingVariations, variations);

        if (!dirs.length || !bundleConfig) {
            return next();
        }

        return res.end(JSON.stringify({
            bundle:bundle,
            variations:variations,
            bundleConfig:bundleConfig,
            dirs:dirs,
            existingVariations:existingVariations,
            config:config
        }, null, '  '));
    });
}

function resolveVariations(existingVariations, variations) {
    var i, j, evar, dir, resolved = [];
    // walk in reverse and fill in reverse achieves desired order
    for (i = existingVariations.length-1; i >= 0; i--) {
        evar = existingVariations[i];
        if (-1 !== variations.indexOf(evar.id)) {
            for (j = evar.chain.length-1; j >= 0; j--) {
                dir = evar.chain[j];
                if (-1 === resolved.indexOf(dir)) {
                    resolved.unshift(dir);
                }
            }
        }
    }
    return resolved;
}


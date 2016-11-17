const analytics = require('../helpers/analytics/analytics-worker')('deps');
const analyticsIpc = require('../helpers/analytics/analytics-worker')('ipc');
const debug = require('debug')('mendel:deps:slave-' + process.pid);
const dep = require('mendel-deps');
const path = require('path');
const VariationalResolver = require('mendel-resolver/variational-resolver');

debug(`[Slave ${process.pid}] online`);

process.on('message', (payload) => {
    const { type,
            filePath,
            normalizedId,
            variation,
            source,
            projectRoot,
            baseConfig,
            variationConfig } = payload;

    if (type === 'start') {
        debug(`Detecting dependencies for ${filePath}`);

        analytics.tic();
        const resolver = new VariationalResolver({
            envNames: ['main', 'browser'],
            variations: [variation, baseConfig.id].filter(Boolean),
            // entry related
            variation,
            normalizedId,
            basedir: path.resolve(projectRoot, path.dirname(filePath)),
            // config params
            projectRoot,
            baseConfig,
            variationConfig,
        });

        debug(`Detecting dependencies for ${filePath}`);
        dep({source, resolver})
        .then((deps) => {
            Object.keys(deps).forEach(literal => {
                Object.keys(deps[literal]).forEach(envName => {
                    deps[literal][envName] = withPrefix(deps[literal][envName]);
                });
            });
            return deps;
        })
        .then((deps) => {
            analytics.toc();
            debug(`Dependencies for ${filePath} found!`);
            analyticsIpc.tic('deps');
            process.send({type: 'done', filePath, deps});
            analyticsIpc.toc('deps');
        })
        .catch(error => {
            debug(`Errored while finding dependencies: "${filePath}"`);
            console.error(error.stack);
            process.send({type: 'error', filePath, error: error.message});
        })
        .catch(err => {
            console.error(err.stack);
        });
    } else if (type === 'exit') {
        debug(`Instructed to exit.`);
        process.exit(0);
    }
});

function withPrefix(path) {
    if (/^\w[^:]/.test(path)) {
        path = './'+path;
    }
    return path;
}

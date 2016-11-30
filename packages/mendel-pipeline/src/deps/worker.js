const analytics = require('../helpers/analytics/analytics-worker')('deps');
const analyticsIpc = require('../helpers/analytics/analytics-worker')('ipc');
const debug = require('debug')('mendel:deps:slave-' + process.pid);
const dep = require('mendel-deps');
const path = require('path');
const BiSourceVariationalResolver = require('mendel-resolver/bisource-resolver');

debug(`[Slave ${process.pid}] online`);

const pendingInquiry = new Map();

process.on('message', (payload) => {
    const { type,
            filePath,
            source,
            projectRoot,
            baseConfig,
            variationConfig } = payload;

    if (type === 'start') {
        debug(`Detecting dependencies for ${filePath}`);

        analytics.tic();
        const resolver = new BiSourceVariationalResolver({
            envNames: ['main', 'browser'],
            // entry related
            basedir: path.resolve(projectRoot, path.dirname(filePath)),
            // config params
            projectRoot,
            baseConfig,
            variationConfig,
            has: (filePath) => {
                return new Promise(resolve => {
                    if (!pendingInquiry.has(filePath)) pendingInquiry.set(filePath, []);
                    pendingInquiry.get(filePath).push(resolve);
                    analyticsIpc.tic('deps');
                    process.send({type: 'has', filePath});
                    analyticsIpc.toc('deps');
                });
            },
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
        });
    } else if (type === 'exit') {
        debug(`Instructed to exit.`);
        process.exit(0);
    } else if (type === 'has') {
        const {value} = payload;
        const pendingResolves = pendingInquiry.get(filePath);
        pendingResolves.forEach(resolve => resolve(value));
    }
});

function withPrefix(path) {
    if (/^\w[^:]/.test(path)) {
        path = './'+path;
    }
    return path;
}

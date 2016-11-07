/**
 * Independent/Isolated file transform
 */
 const analyticsCollector = require('../helpers/analytics/analytics-collector');
const debug = require('debug')('mendel:transformer:master');
const {fork} = require('child_process');
const {extname, resolve: pathResolve} = require('path');
const {existsSync} = require('fs');
const {sync: moduleResolveSync} = require('resolve');

const parallelMode = (function() {
    const numCPUs = require('os').cpus().length;
    const workerProcesses = Array.from(Array(numCPUs)).map(() => fork(`${__dirname}/worker.js`));
    workerProcesses.forEach(cp => analyticsCollector.connectProcess(cp));
    const _idleWorkerQueue = workerProcesses.map(({pid}) => pid);
    const _queue = [];

    function next() {
        if (!_queue.length || !_idleWorkerQueue.length) return;

        const {filename, source, transforms, resolves, rejects} = _queue.shift();
        const idlePid = _idleWorkerQueue.shift();
        const workerProcess = workerProcesses.find(({pid}) => idlePid === pid);

        workerProcess.on('message', function onMessage({error, type, source, map}) {
            // debug(`[Master] <- [Slave ${workerProcess.pid}]: ${type}`);
            if (type !== 'error' && type !== 'done') return;
            if (type === 'error') {
                rejects.forEach(reject => reject(new Error(error)));
            } else if (type === 'done') {
                _idleWorkerQueue.push(workerProcess.pid);
                resolves.forEach(resolve => resolve({source, map}));
            }

            workerProcess.removeListener('message', onMessage);
            next();
        });
        workerProcess.send({type: 'start', transforms, filename, source});
        next();
    }

    process.on('exit', () => {
        workerProcesses.forEach(workerProcess => workerProcess.kill());
    });

    return function queue(transforms, {source, filename}) {
        return new Promise((resolve, reject) => {
            const existingJob = _queue.find(queued => queued.filename === filename && queued.transforms === transforms);

            if (existingJob) {
                existingJob.resolves.push(resolve);
                existingJob.rejects.push(reject);
            } else {
                _queue.push({
                    resolves: [resolve],
                    rejects: [reject],
                    transforms,
                    source,
                    filename,
                });
            }

            next();
        });
    };
})();

function singleMode(transforms, {filename, source}) {
    let promise = Promise.resolve();

    transforms.forEach(transform => {
        promise = promise.then(() => {
            const xform = typeof transform.plugin === 'string' ? require(transform.plugin) : transform.plugin;
            return xform({filename, source}, transform.options);
        });
    });

    return promise;
}

/**
 * Knows how to do all kinds of trasnforms in parallel way
 */
class TrasnformManager {
    constructor(transforms) {
        this._transforms = new Map();

        Object.keys(transforms).forEach(transformId => {
            this._transforms.set(transformId, Object.assign({}, transforms[transformId], {
                id: transformId,
                plugin: this._resolvePlugin(transforms[transformId].plugin),
            }));
        });
    }

    _resolvePlugin(plugin) {
        // pass function
        if (typeof plugin !== 'string') return plugin;
        // file in the cwd
        if (existsSync(pathResolve(process.cwd(), plugin))) return pathResolve(process.cwd(), plugin);
        // node_modules
        if (existsSync(pathResolve(process.cwd(), 'node_modules', plugin, 'package.json'))) {
            const packageJson = require(pathResolve(process.cwd(), 'node_modules', plugin, 'package.json'));

            if ((packageJson.keywords || []).indexOf('mendel-ift') < 0) {
                throw new Error(`Mendel IFT plugin (${plugin}) is not valid.`);
            }

            return moduleResolveSync(plugin, {basedir: process.cwd()});
        }

        throw new Error('Could not find Mendel IFT plugin: ' + plugin);
    }

    transform(filename, transformIds, source) {
        // TODO make sure plugins can handle certain extensions.
        // For instance, babel dies when you pass non-JS source to it.
        if (['.js', '.jsx'].indexOf(extname(filename)) < 0) {
            return Promise.resolve({filename, source});
        }

        debug(`Transforming "${filename}" with [${transformIds}]`);
        const transforms = transformIds.map(transformId => this._transforms.get(transformId));

        let mode;
        if (transformIds.every(transformId => typeof this._transforms.get(transformId).plugin === 'string')) {
            mode = parallelMode;
        } else {
            console.log('[MENDEL][deopt] The transform is not a known one to Mendel and we cannot parallelize it. Please contribute to IFT plugin for faster build.');
            mode = singleMode;
        }

        return mode(transforms, {filename, source});
    }
}

module.exports = TrasnformManager;

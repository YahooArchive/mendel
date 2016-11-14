/**
 * Independent/Isolated file transform
 */
const analyticsCollector = require('../helpers/analytics/analytics-collector');
const analytics = require('../helpers/analytics/analytics')('ipc');
const debug = require('debug')('mendel:transformer:master');
const {fork} = require('child_process');
const {resolve: pathResolve} = require('path');
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
        analytics.tic('transform');
        workerProcess.send({type: 'start', transforms, filename, source});
        analytics.toc('transform');
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
    constructor({cwd, transforms}) {
        this._transforms = new Map();
        transforms.forEach(transform => {
            this._transforms.set(transform.id, Object.assign(transform, {
                plugin: this.resolvePlugin(cwd, transform.plugin),
            }));
        });
    }

    resolvePlugin(cwd, plugin) {
        if (existsSync(pathResolve(cwd, plugin))) return pathResolve(cwd, plugin);

        // node_modules do not live in the cwd. We search where mendelrc is.
        return moduleResolveSync(plugin, {basedir: process.cwd()});
    }

    transform(filename, transformIds, source) {
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

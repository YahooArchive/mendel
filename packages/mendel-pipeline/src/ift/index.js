/**
 * Independent/Isolated file transform
 */
const debug = require('debug')('mendel-ift-master');
const EventEmitter = require('events').EventEmitter;
const {fork} = require('child_process');
const {extname, resolve: pathResolve} = require('path');
const {existsSync} = require('fs');
const {sync: moduleResolveSync} = require('resolve');

const parallelMode = (function() {
    const numCPUs = require('os').cpus().length / 2;
    const workerProcesses = Array.from(Array(numCPUs)).map(() => fork(`${__dirname}/worker.js`));
    const _idleWorkerQueue = workerProcesses.map(({pid}) => pid);
    const _queue = [];

    function next() {
        if (!_queue.length || !_idleWorkerQueue.length) return;

        const {filename, source, transforms, resolve, reject} = _queue.shift();
        const idlePid = _idleWorkerQueue.shift();
        const workerProcess = workerProcesses.find(({pid}) => idlePid === pid);

        workerProcess.once('message', ({error, type, source, map}) => {
            debug(`[Master] <- [Slave ${workerProcess.pid}]: ${type}`);

            if (type === 'error') {
                reject(new Error(error));
            } else if (type === 'done') {
                _idleWorkerQueue.push(workerProcess.pid);
                resolve({source, map});
            }

            next();
        });
        workerProcess.send({type: 'start', transforms, filename, source});
        next();
    }

    return function queue(transforms, {source, filename}) {
        return new Promise((resolve, reject) => {
            _queue.push({
                resolve,
                reject,
                transforms,
                source,
                filename,
            });

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
 * Responsible for knowing what set of transforms are available
 */
class IsolatedFileTrasnformManager extends EventEmitter {
    constructor(transforms) {
        super();
        this._transforms = new Map();

        Object.keys(transforms).forEach(transformId => {
            this._transforms.set(transformId, Object.assign({}, transforms[transformId], {
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

    _getTransformIds(filePath) {
        // TODO select set of transform Id based on file path.
        return Array.from(this._transforms.keys());
    }

    transform(filename, source) {
        // TODO make sure plugins can handle certain extensions.
        // For instance, babel dies when you pass non-JS source to it.
        if (['.js', '.jsx'].indexOf(extname(filename)) < 0) {
            return this.emit('transformed', filename, source);
        }

        const transformIds = this._getTransformIds(filename);
        const transforms = transformIds.map(transformId => this._transforms.get(transformId));

        let mode;
        if (transformIds.every(transformId => typeof this._transforms.get(transformId).plugin === 'string')) {
            mode = parallelMode;
        } else {
            console.log('[MENDEL][deopt] The transform is not a known one to Mendel and we cannot parallelize it. Please contribute to IFT plugin for faster build.');
            mode = singleMode;
        }

        return mode(transforms, {filename, source}).then(result => {
            this.emit('transformed', filename, result);
        }).catch(error => {
            console.log('Error', error.stack);
            debug('Error: ' +  error.message);

            this.emit('done', filename, source);
        });
    }
}

module.exports = IsolatedFileTrasnformManager;

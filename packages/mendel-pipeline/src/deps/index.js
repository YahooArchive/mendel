const analyticsCollector = require('../helpers/analytics/analytics-collector');
const ipcAnalytics = require('../helpers/analytics/analytics')('ipc');
const debug = require('debug')('mendel:deps:master');
const {fork} = require('child_process');
const numCPUs = require('os').cpus().length;
const path = require('path');

function withPrefix(path) {
    if (/^\w[^:]/.test(path)) path = './' + path;
    return path;
}

/**
 * Knows how to do all kinds of trasnforms in parallel way
 */
class DepsManager {
    /**
     * @param {String} config.projectRoot
     */
    constructor({projectRoot, baseConfig, variationConfig, shim}, mendelCache) {
        this._mendelCache = mendelCache;
        this._projectRoot = projectRoot;
        this._baseConfig = baseConfig;
        this._variationConfig = variationConfig;
        this._shim = shim;
        this._queue = [];
        this._workerProcesses = Array.from(Array(numCPUs)).map(() => fork(`${__dirname}/worker.js`));
        this._workerProcesses.forEach(cp => analyticsCollector.connectProcess(cp));
        this._idleWorkerQueue = this._workerProcesses.map(({pid}) => pid);
        process.on('exit', () => {
            this._workerProcesses.forEach(workerProcess => workerProcess.kill());
        });
    }

    detect(entryId, source) {
        setImmediate(() => this.next());

        // Acorn used in deps can only parse js and jsx types.
        if (['.js', '.jsx'].indexOf(path.extname(entryId)) < 0) {
            // there are no dependency
            return Promise.resolve({id: entryId, deps: {}});
        }

        return new Promise((resolve, reject) => {
            this._queue.push({
                resolve, reject,
                filePath: entryId,
                source: source,
            });
        });
    }

    resolve(resolve, entryId, rawDeps) {
        const deps = Object.assign({}, rawDeps);

        // When a shim is present in one of the deps:
        // main: false so we don't include node packages into Mendel pipeline
        // browser: path to the shim -- this will make pipeline include such shims
        Object.keys(deps)
        .filter(literal => this._shim[literal])
        .forEach(literal => {
            deps[literal] = {
                main: false,
                browser: this._shim[literal],
            };
        });

        // Noramlize the path
        // This step is required because mendel-resolve returns absolute path
        // instead of relative path. Since mendel-pipeline understands everything
        // with relative path, this is needed.
        Object.keys(deps)
        .forEach(literal => {
            Object.keys(deps[literal])
            // can be false in case of shimmed one
            .filter(runtime => deps[literal][runtime])
            .forEach(runtime => {
                deps[literal][runtime] = withPrefix(path.relative(this._projectRoot, deps[literal][runtime]));
            });
        });

        resolve({id: entryId, deps});
    }

    next() {
        if (!this._queue.length || !this._idleWorkerQueue.length) return;

        const self = this;
        const {filePath, source, resolve, reject} = this._queue.shift();
        const workerId = this._idleWorkerQueue.shift();
        const workerProcess = this._workerProcesses.find(({pid}) => workerId === pid);

        workerProcess.on('message', function onMessage({error, type, filePath, deps}) {
            if (type === 'error') {
                // do something about this error
                debug(`Error occurred : ${error}`);
                reject(error);
            } else if (type === 'done') {
                self._idleWorkerQueue.push(workerProcess.pid);
                debug(filePath, deps);
                self.resolve(resolve, filePath, deps);
            } else if (type === 'has') {
                const value = self._mendelCache.hasEntry(filePath);
                ipcAnalytics.tic('deps');
                workerProcess.send({
                    type: 'has',
                    value,
                    filePath,
                });
                ipcAnalytics.toc('deps');
            }

            if (type === 'error' || type === 'done') {
                // No longer needed
                workerProcess.removeListener('message', onMessage);
            }

            self.next();
        });

        ipcAnalytics.tic('deps');
        workerProcess.send({
            type: 'start',
            // entry properties
            source,
            filePath,
            // config properties
            projectRoot: this._projectRoot,
            baseConfig: this._baseConfig,
            variationConfig: this._variationConfig,
        });
        ipcAnalytics.toc('deps');
        this.next();
    }
}

module.exports = DepsManager;

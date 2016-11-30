const analyticsCollector = require('../helpers/analytics/analytics-collector');
const ipcAnalytics = require('../helpers/analytics/analytics')('ipc');
const debug = require('debug')('mendel:deps:master');
const {fork} = require('child_process');
const numCPUs = require('os').cpus().length;
const path = require('path');

/**
 * Knows how to do all kinds of trasnforms in parallel way
 */
class DepsManager {
    /**
     * @param {String} config.projectRoot
     */
    constructor({projectRoot, baseConfig, variationConfig}, mendelCache) {
        this._mendelCache = mendelCache;
        this._projectRoot = projectRoot;
        this._baseConfig = baseConfig;
        this._variationConfig = variationConfig;
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
                resolve({id: filePath, deps});
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

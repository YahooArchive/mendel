/**
 * Independent/Isolated file transform
 */
const analyticsCollector = require('../../helpers/analytics/analytics-collector');
const debug = require('debug')('mendel:deps:manager');
const EventEmitter = require('events').EventEmitter;
const {fork} = require('child_process');
const numCPUs = require('os').cpus().length;
const {extname} = require('path');

/**
 * Knows how to do all kinds of trasnforms in parallel way
 */
class DepsManager extends EventEmitter {
    /**
     * @param {MendelRegistry} registry
     * @param {String} config.cwd
     */
    constructor({registry}, {cwd, basetree, base, variationsdir}) {
        super();
        this._registry = registry;

        this._cwd = cwd;
        this._basetree = basetree;
        this._baseName = base;
        this._variationsdir = variationsdir;
        this._queue = [];
        this._workerProcesses = Array.from(Array(numCPUs)).map(() => fork(`${__dirname}/worker.js`));
        this._workerProcesses.forEach(cp => analyticsCollector.connectProcess(cp));
        this._idleWorkerQueue = this._workerProcesses.map(({pid}) => pid);

        this._registry.on('sourceTransformed', (entry, transformIds) => {
            // TODO make this configurable. Non-JS is yet parsible
            if (['.js', '.jsx'].indexOf(extname(entry.id)) < 0) return;
            if (!entry.dependenciesUpToDate) {
                this._queue.push({
                    filePath: entry.id,
                    source: entry.getSource(transformIds),
                    variation: entry.variation,
                });
            }

            this.next();
        });

        this._workerProcesses.forEach(workerProcess => {
            workerProcess.on('message', ({error, type, filePath, deps}) => {
                if (type === 'error') {
                    // do something about this error
                    debug(`Error occurred : ${error}`);
                } else if (type === 'done') {
                    this._idleWorkerQueue.push(workerProcess.pid);

                    debug(filePath, deps);

                    Object.keys(deps).map(key => deps[key]).forEach(({browser, main}) => {
                        // In case the entry is missing for dependency, time to add them into our pipeline.
                        if (!this._registry.hasEntry(browser)) this._registry.addToPipeline(browser);
                        if (!this._registry.hasEntry(main)) this._registry.addToPipeline(main);
                    });
                    this._registry.setDependencies(filePath, deps);
                }

                this.next();
            });
        });

        process.on('exit', () => {
            this._workerProcesses.forEach(workerProcess => workerProcess.kill());
        });
    }

    next() {
        if (!this._queue.length || !this._idleWorkerQueue.length) return;

        const {filePath, source, variation} = this._queue.shift();
        const workerId = this._idleWorkerQueue.shift();
        const workerProcess = this._workerProcesses.find(({pid}) => workerId === pid);
        workerProcess.send({
            type: 'start',
            filePath,
            variation,
            source,
            cwd: this._cwd,
            baseDir: this._basetree,
            baseName: this._baseName,
            varsDir: this._variationsdir,
        });
        this.next();
    }
}

module.exports = DepsManager;

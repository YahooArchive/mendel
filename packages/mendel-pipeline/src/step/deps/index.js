/**
 * Independent/Isolated file transform
 */
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
    constructor({registry}, {cwd, basetree, variationsdir}) {
        super();
        this._registry = registry;

        this._cwd = cwd;
        this._basetree = basetree;
        this._variationsdir = variationsdir;
        this._queue = [];
        this._workerProcesses = Array.from(Array(numCPUs)).map(() => fork(`${__dirname}/worker.js`));
        this._idleWorkerQueue = this._workerProcesses.map(({pid}) => pid);

        this._registry.on('sourceTransformed', (filePath, transformIds, source) => {
            // TODO make this configurable. Non-JS is yet parsible
            if (['.js', '.jsx'].indexOf(extname(filePath)) < 0) return;

            if (!this._registry.getEntry(filePath).dependenciesUpToDate) {
                this._queue.push({source, filePath});
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

        const {filePath, source} = this._queue.shift();
        const workerId = this._idleWorkerQueue.shift();
        const workerProcess = this._workerProcesses.find(({pid}) => workerId === pid);
        workerProcess.send({
            type: 'start',
            filePath,
            source,
            cwd: this._cwd,
            baseDir: this._basetree,
            varsDir: this._variationsdir,
        });
        this.next();
    }
}

module.exports = DepsManager;

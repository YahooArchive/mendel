const analyticsCollector = require('../helpers/analytics/analytics-collector');
const analyzeIpc = require('../helpers/analytics/analytics')('ipc');
const {fork} = require('child_process');
const numCPUs = require('os').cpus().length;
const Protocol = require('./protocol');
const path = require('path');

class BaseMasterProcess {
    static get Protocol() {
        return Protocol;
    }

    constructor(workerFileName, options={}) {
        this._name = options.name || 'unamed_multi_process';
        this._workers = Array.from(Array(options.numWorker || numCPUs))
            .map(() => {
                return fork(
                    path.join(__dirname, 'worker.js'),
                    [this._name, workerFileName].concat(options.workerArgs)
                );
            });
        this._workers.forEach(cp => analyticsCollector.connectProcess(cp));

        // Queues
        this._idleWorkers = this._workers.map(({pid}) => pid);
        this._jobs = [];

        // Get Listeners from subclass
        this._subscribers = this.subscribe();
    }

    _exit() {
        this._workers.forEach(w => w.kill());
    }

    onExit() {
        this._exit();
    }

    onForceExit() {
        this._exit();
    }

    subscribe() {
        throw new Error(
            'Required "subscribe" method is not implemented for ' +
            this.constructor.name
        );
    }

    dispatchJob(args) {
        setImmediate(() => this._next());
        return new Promise((resolve, reject) => {
            this._jobs.push({
                args,
                promise: {
                    resolve,
                    reject,
                },
            });
        });
    }

    _next() {
        if (!this._jobs.length || !this._idleWorkers.length) return;

        const self = this;

        const {args, promise} = this._jobs.shift();
        const workerId = this._idleWorkers.shift();
        const worker = this._workers.find(({pid}) => workerId === pid);

        // Since we didn't put the workerId back to the idle queue, it
        // should never be used.
        if (!worker.connected) {
            const ind = this._workers.indexOf(worker);
            this._workers.splice(ind, 1);
            return this._next();
        }

        worker.on('message', function onMessage({type, message}) {
            setImmediate(() => self._next());
            if (type === Protocol.ERROR || type === Protocol.DONE) {
                // No longer needed
                worker.removeListener('message', onMessage);
                self._idleWorkers.push(worker.pid);
            }

            if (type === Protocol.ERROR) {
                promise.reject(message);
            } else if (type === Protocol.DONE) {
                promise.resolve(message);
            } else {
                if (!self._subscribers[type]) return;
                self._subscribers[type](message, (type, sendArg) => {
                    analyzeIpc.tic(this._name);
                    worker.send({
                        type,
                        args: sendArg,
                    });
                    analyzeIpc.toc(this._name);
                });
            }
        });

        analyzeIpc.tic(this._name);
        worker.send({
            type: Protocol.START,
            // entry properties
            args,
        });
        analyzeIpc.toc(this._name);
        setImmediate(() => this._next());
    }
}

module.exports = BaseMasterProcess;

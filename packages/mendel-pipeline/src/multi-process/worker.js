const analyzeIpc = require('../helpers/analytics/analytics-worker')('ipc');
const debug = require('debug');
const Protocol = require('./protocol');

class Worker {
    static init() {
        return new Worker(
            process.argv[2],
            process.argv[3],
            process.argv.slice(4)
        );
    }

    constructor(name, workerModule, options) {
        this._name = name;
        this.options = options;
        this._workerName = `${this._name}:${process.pid}`;
        this.debug = debug(`mendel:${this._workerName}`);
        this.debug('Online');

        process.title = this._workerName;
        // Event binding
        process.on('message', args => this._onMessage(args));
        process.on('exit', () => {
            if (this._subscriptions && this._subscriptions.onExit) {
                this._subscriptions.onExit();
            }
            this.debug(`Gracefully exited`);
        });
        // childProcess.kill triggers this. We want to gracefully exit
        process.on('SIGTERM', () => process.exit(0));

        this._subscriptions = require(workerModule)(arg => {
            this.dispatchDone(arg);
        }, options);
        // Validation
        if (!this._subscriptions[Protocol.START]) {
            throw new Error([
                `Required subscriber for "${Protocol.START}" missing`,
                `in ${this.constructor.name}`,
            ].join(' '));
        }
    }

    dispatchDone(result) {
        // console.log('sending?!', result);
        this._send(Protocol.DONE, result);
    }

    _onMessage({type, args}) {
        const subscriber = this._subscriptions[type];
        if (!subscriber) return;

        try {
            const artifact = subscriber(args, (type, args) => {
                this._send(type, args);
            });

            if (artifact instanceof Promise) {
                if (type === Protocol.START) {
                    artifact.then(this.dispatchDone.bind(this));
                }
                artifact.catch(this._onError.bind(this));
            }
        } catch (e) {
            this._onError(e);
        }
    }

    _onError(error) {
        this._send(Protocol.ERROR, error);
    }

    _send(type, message) {
        analyzeIpc.tic(this._name);
        process.send({
            type,
            message,
        });
        analyzeIpc.toc(this._name);
    }
}

Worker.init();

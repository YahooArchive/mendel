const EventEmitter = require('events').EventEmitter;
const mendelConfig = require('mendel-config');
const CacheClient = require('../cache/client');
const MendelGenerators = require('./generators');
const MendelClientRegistry = require('../registry/client');
const Outlets = require('./outlets');
const DefaultShims = require('node-libs-browser');

process.title = 'Mendel Client';

class BaseMendelClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.debug = require('debug')('mendel:client:' + this.constructor.name);

        if (options.config === false) {
            this.config = options;
        } else {
            this.config = mendelConfig(
                Object.assign({defaultShim: DefaultShims}, options)
            );
        }

        this._verbose =
            typeof options.verbose !== 'undefined'
                ? options.verbose
                : process.env.NODE_ENV === 'development' ||
                  typeof process.env.NODE_ENV === 'undefined';

        this.registry = new MendelClientRegistry(this.config);
        this.generators = new MendelGenerators(this.config, this.registry);
        this.outlets = new Outlets(this.config);
        this.synced = false;
        process.once('SIGINT', () => this.exit());
    }

    _setupClient() {
        this.client = new CacheClient(this.config, this.registry);
        this.client.on('error', error => {
            if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
                console.error(
                    [
                        '[Mendel] This action requires mendel',
                        'builder running as a separate process.\n',
                    ].join(' ')
                );
                process.exit(1);
            }
        });

        this.client.on(
            'sync',
            function() {
                clearTimeout(this.initSyncMessage);
                this.emit('ready');
                this.synced = true;
                this.onSync.apply(this, arguments);

                this.debug('synced');
            }.bind(this)
        );
        this.client.on(
            'unsync',
            function() {
                this.debug('file change detected...');
                this.emit('change');
                this.synced = false;
                this.onUnsync.apply(this, arguments);
            }.bind(this)
        );
    }

    run(callback = () => {}) {
        this._setupClient();

        // Print a message if it does not sync within a second.
        if (this._verbose) {
            this.initSyncMessage = setTimeout(() => {
                this.initSyncMessage = null;
                console.log(
                    [
                        '[Mendel] Recent builder (re)start detected,',
                        'compiling might take a moment...',
                        '\n         To avoid this message,',
                        'leave your builder always running',
                    ].join(' ')
                );
            }, 3000);
        }

        // This will come after the sync listener that generates and outlets
        this.once('done', () => {
            this.exit();
            callback.call(null);
        });
        this.once('error', error => {
            console.error('[Mendel SEVERE] Outlet error', error);
            this.exit();
            callback.call(null, error);
        });
        this.client.once('error', error => {
            this.exit();
            callback.call(null, error);
        });
        this.client.start();
        return this;
    }

    exit() {
        if (this.client) this.client.onExit();
    }

    onUnsync(entryId) {
        // eslint-disable-line no-unused-vars
    }

    onSync() {}

    isReady() {
        return this.synced;
    }
}

module.exports = BaseMendelClient;

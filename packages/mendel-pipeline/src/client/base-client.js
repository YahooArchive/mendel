const EventEmitter = require('events').EventEmitter;
const mendelConfig = require('../../../mendel-config');
const CacheClient = require('../cache/client');
const MendelGenerators = require('./generators');
const MendelClientRegistry = require('../registry/client');
const Outlets = require('./outlets');
const DefaultShims = require('node-libs-browser');

process.title = 'Mendel Client';

class BaseMendelClient extends EventEmitter {
    constructor(options={}) {
        super();
        this.debug = require('debug')('mendel:client:' + this.constructor.name);

        if (options.config === false) {
            this.config = options;
        } else {
            this.config = mendelConfig(
                Object.assign({defaultShim: DefaultShims}, options)
            );
        }

        this._verbose = typeof options.verbose !== 'undefined' ?
            options.verbose :
            (
                process.env.NODE_ENV === 'development' ||
                typeof process.env.NODE_ENV === 'undefined'
            );

        this.registry = new MendelClientRegistry(this.config);
        this.generators = new MendelGenerators(this.config, this.registry);
        this.outlets = new Outlets(this.config);
        this._setupClient();
        this.synced = false;
    }

    _setupClient() {
        this.client = new CacheClient(this.config, this.registry);
        this.client.on('error', (error) => {
            if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
                console.error([
                    'Please, use --outlet only when you have another',
                    'mendel process running on --watch mode.',
                ].join(' '));
                process.exit(1);
            }
        });

        this.client.on('sync', function() {
            clearTimeout(this.initSyncMessage);
            this.emit('ready');
            this.synced = true;
            this.onSync.apply(this, arguments);

            if (this._verbose)
                console.log('[Mendel] Synced');
        }.bind(this));
        this.client.on('unsync', function() {
            if (this._verbose)
                console.log('[Mendel] File change detected. Waiting to sync again...'); // eslint-disable-line max-len
            this.emit('change');
            this.synced = false;
            this.onUnsync.apply(this, arguments);
        }.bind(this));
    }

    run(callback=()=>{}) {
        // Print a message if it does not sync within a second.
        if (this._verbose) {
            this.initSyncMessage = setTimeout(() => {
                this.initSyncMessage = null;
                console.log([
                    '[Mendel] Waiting for sync. Can take few moments',
                    'if an environment performs complex operations.',
                ].join(' '));
            }, 3000);
        }

        // This will come after the sync listener that generates and outlets
        this.once('done', () => {
            this.exit();
            callback.call(null);
        });
        this.once('error', error => {
            console.log('[Mendel SEVERE] Outlet error', error);
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

    onUnsync(entryId) { // eslint-disable-line no-unused-vars
    }

    onSync() {
    }

    isReady() {
        return this.synced;
    }
}

module.exports = BaseMendelClient;

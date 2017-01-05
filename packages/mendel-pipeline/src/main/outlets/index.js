const EventEmitter = require('events').EventEmitter;

const mendelConfig = require('../../../../mendel-config');
const CacheClient = require('../../cache/client');
const MendelGenerators = require('./generators');
const MendelOutletRegistry = require('../../registry/outlet');
const Outlets = require('./outlets');
const DefaultShims = require('node-libs-browser');

process.title = 'Mendel Outlet';

class MendelOutlets extends EventEmitter {
    constructor(options) {
        super();

        if (options.config === false) {
            this.config = options;
        } else {
            this.config = mendelConfig(
                Object.assign({defaultShim: DefaultShims}, options)
            );
        }

        this.registry = new MendelOutletRegistry(this.config);
        this.generators = new MendelGenerators(this.config, this.registry);
        this.outlets = new Outlets(this.config);
        this.setupClient();
    }

    setupClient() {
        this.client = new CacheClient(this.config, this.registry);

        this.client.on('error', (error) => {
            if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
                console.error('Please, use --outlet only when you have another'+
                    'mendel process running on --watch mode.');
                process.exit(1);
            }
        });

        this.client.on('sync', () => {
            Promise.resolve()
            .then(() => this.generators.perform())
            .then(bundles => this.outlets.perform(bundles))
            .then(() => this.emit('done'))
            .catch(e => this.emit('error', e));
        });
    }

    run(callback=()=>{}) {
        // This will come after the sync listener that generates and outlets
        this.once('done', () => {
            this.exit();
            callback.call(null);
        });
        this.once('error', error => {
            console.log('[SEVERE] Outlet error', error);
            this.exit();
            callback.call(null, error);
        });
        this.client.once('error', error => {
            this.exit();
            callback.call(null, error);
        });
        this.client.start();
    }

    exit() {
        if (this.client) this.client.onExit();
    }
}

module.exports = MendelOutlets;

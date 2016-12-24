const mendelConfig = require('../../../../mendel-config');
const CacheClient = require('../../cache/client');
const MendelGenerators = require('./generators');
const MendelOutletRegistry = require('../../registry/outlet');
const Outlets = require('./outlets');
const DefaultShims = require('node-libs-browser');

class MendelOutlets {
    constructor(options) {
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
            const bundles = this.generators.perform();
            this.outlets.perform(bundles);
        });
    }

    run(callback=()=>{}) {
        this.client.once('sync', callback);
        this.client.once('error', callback);
        this.client.start();
    }
}

module.exports = MendelOutlets;

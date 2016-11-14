const debug = require('debug')('mendel:daemon');
const mendelConfig = require('../../mendel-config');

const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');
const MendelPipeline = require('./pipeline');
const Transformer = require('./transformer');
const MendelRegistry = require('./registry');
const Watcher = require('./step/fs-watcher');
const Reader = require('./step/fs-reader');

require('./helpers/analytics/analytics-collector').setOptions({
    printer: new AnalyticsCliPrinter({enableColor: true}),
});

module.exports = class MendelPipelineDaemon {
    constructor(options) {
        const config = mendelConfig(options);

        // whitelist config properties, those config properties
        // don't change per environment
        // TODO: validate this behavior and provide object from on mendel-config
        const {cwd, baseConfig, variationConfig, transforms} = config;
        const stateConfig = {cwd, baseConfig, variationConfig, transforms};

        // Create global state and global steps
        this.state = {
            registry: new MendelRegistry(stateConfig),
            transformer: new Transformer(stateConfig),
        };
        this.defaultSteps = {
            watcher: new Watcher(this.state, config),
            reader: new Reader(this.state, config),
        };

        // Create environments
        this.environments = {};
        this.environments['default'] = config;
        this.environments[config.environment] = config;
        Object.keys(config.env).forEach((environment) => {
            if (!this.environments.hasOwnProperty(environment)) {
                const envConf = mendelConfig(
                    Object.assign({}, options, {environment})
                );
                this.environments[environment] = envConf;
            }
        });
        this.pipelines = {};
    }

    watch(environment) {
        const pipeline = this.getPipeline(environment);
        this.startServer(pipeline);
        pipeline.watch(environment);
    }

    run(environment) {
        const pipeline = this.getPipeline(environment);
        this.bindOutlets(pipeline);
        pipeline.run(environment);
    }

    startServer(pipeline) {
        debug(`TODO: not implemented startServer(pipeline) ${pipeline}`);
    }

    bindOutlets(pipeline) {
        debug(`TODO: not implemented bindOutlets(pipeline) ${pipeline}`);
    }

    getPipeline(environment) {
        environment = environment || 'default';
        if (!this.pipelines[environment]) {
            debug('init', environment);
            const envConf = this.environments[environment];
            this.pipelines[environment] = new MendelPipeline({
                defaultSteps: this.defaultSteps,
                state: this.state,
                options: envConf,
            });
        }
        return this.pipelines[environment];
    }
};

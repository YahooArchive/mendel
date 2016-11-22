const debug = require('debug')('mendel:daemon');
const mendelConfig = require('../../mendel-config');

const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');

const MendelCache = require('./cache');
const Watcher = require('./fs-watcher');
const Transformer = require('./transformer');
const DepResolver = require('./deps');

const MendelPipeline = require('./pipeline');

require('./helpers/analytics/analytics-collector').setOptions({
    printer: new AnalyticsCliPrinter({enableColor: true}),
});

module.exports = class MendelPipelineDaemon {
    constructor(options) {
        const config = mendelConfig(options);

        this.cache = new MendelCache(config);
        this.transformer = new Transformer(config);
        this.depsResolver = new DepResolver(config);

        this.watcher = new Watcher(config, this.cache);

        // Create environments
        this.environments = {};
        this.pipelines = {};
        this.default = config.environment;
        this.environments[config.environment] = config;
        Object.keys(config.env).forEach((environment) => {
            if (!this.environments.hasOwnProperty(environment)) {
                const envConf = mendelConfig(
                    Object.assign({}, options, {environment})
                );
                this.environments[environment] = envConf;
            }
        });

        this.watcher.subscribe(config.variationConfig.allDirs);
    }

    watch(environment=this.default) {
        // this prioritizes the default env first
        const pipeline = this.getPipeline(environment);
        pipeline.on('idle', () => this.watchAll());
    }

    watchAll() {
        Object.keys(this.environments).forEach(envName => {
            this.watch(envName);
        });
    }

    run(environment=this.default) {
        const pipeline = this.getPipeline(environment);
        pipeline.on('idle', () => process.exit(0));
    }

    getPipeline(environment=this.default) {
        if (!this.pipelines[environment]) {
            debug('init', environment);
            const envConf = this.environments[environment];
            this.pipelines[environment] = new MendelPipeline({
                cache: this.cache,
                transformer: this.transformer,
                depsResolver: this.depsResolver,
                options: envConf,
            });
            this.pipelines[environment].watch();
        }
        return this.pipelines[environment];
    }
};

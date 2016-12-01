const debug = require('debug')('mendel:daemon');
const mendelConfig = require('../../mendel-config');

const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');
const EventEmitter = require('events').EventEmitter;
const MendelCache = require('./cache');
const Watcher = require('./fs-watcher');
const Transformer = require('./transformer');
const DepResolver = require('./deps');

const MendelPipeline = require('./pipeline');
const CacheServer = require('./cache/server');

require('./helpers/analytics/analytics-collector').setOptions({
    printer: new AnalyticsCliPrinter({enableColor: true}),
});

class CacheManager extends EventEmitter {
    constructor() {
        super();
        this._caches = new Map();
    }

    addCache(env, cache) {
        this._caches.set(env, cache);
        cache.on('entryRequested', (path) => {
            this.emit('entryRequested', path);
        });
        cache.on('doneEntry', (entry) => {
            this.emit('doneEntry', cache, entry);
        });
    }

    getCache(env) {
        return this._caches.get(env);
    }

    addEntry(id) {
        Array.from(this._caches.values())
            .forEach(cache => cache.addEntry(id));
    }

    hasEntry(id) {
        return Array.from(this._caches.values())
            .some(cache => cache.hasEntry(id));
    }

    removeEntry(id) {
        Array.from(this._caches.values())
            .forEach(cache => cache.removeEntry(id));
        this.emit('entryRemoved', id);
    }

}

module.exports = class MendelPipelineDaemon {
    constructor(options) {
        const config = mendelConfig(options);

        this.cacheManager = new CacheManager();
        this.transformer = new Transformer(config);
        // Dependency resolver consults with cache
        this.depsResolver = new DepResolver(config, this.cacheManager);

        this.server = new CacheServer(config, this.cacheManager);
        this.watcher = new Watcher(config, this.cacheManager);

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

        this.server.on('environmentRequested', (env) => this.watch(env));
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
            const cache = new MendelCache(envConf);

            this.cacheManager.addCache(environment, cache);
            this.pipelines[environment] = new MendelPipeline({
                cache,
                transformer: this.transformer,
                depsResolver: this.depsResolver,
                options: envConf,
            });
            this.pipelines[environment].watch();
        }
        return this.pipelines[environment];
    }
};

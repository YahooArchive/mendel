const debug = require('debug')('mendel:daemon');
const mendelConfig = require('../../../mendel-config');

const AnalyticsCliPrinter = require('../helpers/analytics/cli-printer');
const EventEmitter = require('events').EventEmitter;
const MendelCache = require('../cache');
const Watcher = require('../fs-watcher');
const Transformer = require('../transformer');
const DepResolver = require('../deps');

const MendelPipeline = require('../pipeline');
const CacheServer = require('../cache/server');
const DefaultShims = require('node-libs-browser');

require('../helpers/analytics/analytics-collector').setOptions({
    printer: new AnalyticsCliPrinter({enableColor: true}),
});

class CacheManager extends EventEmitter {
    constructor() {
        super();
        this._caches = new Map();
        this._watchedFileId = new Set();
    }

    addCache(cache) {
        const env = cache.environment;
        this._caches.set(env, cache);
        cache.on('entryRequested', (path) => {
            this.emit('entryRequested', path);
        });
        cache.on('doneEntry', (entry) => this.emit('doneEntry', cache, entry));
        cache.on('entryRemoved', (entry) => this.emit('entryRemoved', cache, entry));
    }

    /**
     * Sync is called after pipeline is initialized with event handlers and steps
     */
    sync(to) {
        const caches = Array.from(this._caches.values())
            .filter(cache => cache !== to);
        Array.from(this._watchedFileId.keys()).forEach(id => {
            const from = caches.find(cache => cache.hasEntry(id));
            // TODO clean up and remove entry everywhere if no cache has this entry
            if (!from) return;

            const entry = from.getEntry(id);
            to.addEntry(id);
            to.getEntry(id).setSource(entry.getRawSource(), entry.getRawDeps());
        });
    }

    getCache(env) {
        return this._caches.get(env);
    }

    addEntry(id) {
        this._watchedFileId.add(id);
        Array.from(this._caches.values())
            .forEach(cache => cache.addEntry(id));
    }

    hasEntry(id) {
        return Array.from(this._caches.values())
            .some(cache => cache.hasEntry(id));
    }

    removeEntry(id) {
        this._watchedFileId.delete(id);
        Array.from(this._caches.values())
            .forEach(cache => cache.removeEntry(id));
    }

}

module.exports = class MendelPipelineDaemon {
    constructor(options) {
        options = Object.assign({defaultShim: DefaultShims}, options);
        const config = mendelConfig(options);
        this.config = config;

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

        // process.on('exit', () => {
        //     process.emit('mendelExit');
        //     this.server.close();
        // });
    }

    watchAll() {
        Object.keys(this.environments).forEach(envName => {
            this.watch(envName);
        });
    }

    run(callback, environment=this.default) {
        const pipeline = this.getPipeline(environment);
        pipeline.on('idle', () => {
            const MendelOutlets = require('./outlets');
            const outlet = new MendelOutlets(this.config);
            outlet.run(() => {
                process.emit('mendelExit');
                this.server.close();
                callback();
            });
        });
    }

    getPipeline(environment=this.default) {
        if (!this.pipelines[environment]) {
            debug('init', environment);
            const envConf = this.environments[environment];
            const cache = new MendelCache(envConf);

            this.cacheManager.addCache(cache);
            this.pipelines[environment] = new MendelPipeline({
                cache,
                transformer: this.transformer,
                depsResolver: this.depsResolver,
                options: envConf,
            });
            this.cacheManager.sync(cache);
            this.pipelines[environment].watch();
        }
        return this.pipelines[environment];
    }
};

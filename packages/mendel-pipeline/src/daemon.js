const debug = require('debug')('mendel:daemon');
const mendelConfig = require('../../mendel-config');

const EventEmitter = require('events').EventEmitter;
const MendelCache = require('./cache');
const Watcher = require('./fs-watcher');
const Transformer = require('./transformer');
const DepResolver = require('./deps');

const MendelPipeline = require('./pipeline');
const CacheServer = require('./cache/server');
const DefaultShims = require('node-libs-browser');

process.title = 'Mendel Daemon';

class CacheManager extends EventEmitter {
    constructor() {
        super();
        this._caches = new Map();
        this._watchedFileId = new Set();
    }

    addCache(cache) {
        const env = cache.environment;
        this._caches.set(env, cache);
        cache.on('entryRequested', path => this.emit('entryRequested', path));
        cache.on('doneEntry', ent => this.emit('doneEntry', cache, ent));
        cache.on('entryRemoved', ent => this.emit('entryRemoved', cache, ent));
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
            to.getEntry(id).setSource(entry.rawSource, entry.rawDeps, entry.map);
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

        this.server.on('environmentRequested', (env) => this._watch(env));
        this.watcher.subscribe(config.variationConfig.allDirs);

        if (config.support) {
            this.watcher.subscribe(config.support);
        }
    }

    _watch(environment) {
        // this prioritizes the default env first
        return this.getPipeline(environment);
    }

    watch(environment=this.default) {
        const pipeline = this._watch(environment);

        // In the watch mode, after first `environment` is processed,
        // we want to process all environments declared.
        pipeline.once('idle', () => {
            // Without printing this out, it is super hard to know when
            // you are ready to start a client process
            console.log(`Daemon - "${environment}" is ready`);
            Object.keys(this.environments).forEach(envName => {
                this._watch(envName);
            });
        });

        process.once('SIGINT', () => process.exit(0));
        process.once('SIGTERM', () => process.exit(0));
        // Above `process.exit()` results in `exit` event.
        process.once('exit', () => this.onExit());
        process.once('uncaughtException', (error) => {
            console.log([
                `Force closing due to a critical error:\n`,
            ], error.stack);

            this.onForceExit();
        });
    }

    run(callback, environment=this.default) {
        const pipeline = this.getPipeline(environment);
        pipeline.on('idle', () => {
            this.onExit();
            callback();
        });
    }

    getPipeline(environment=this.default) {
        if (!this.pipelines[environment]) {
            debug(`Initializing for environment: ${environment}`);
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

    // For graceful exit
    onExit() {
        debug('Exiting gracefully. Cleaning up.');
        [
            this.cacheManager,
            this.transformer, this.depsResolver,
            this.server, this.watcher,
        ].filter(tool => tool.onExit)
        .forEach(tool => tool.onExit());
    }

    onForceExit() {
        debug('Instructed to force exit');
        [
            this.cacheManager,
            this.transformer, this.depsResolver,
            this.server, this.watcher,
        ].filter(tool => tool.onForceExit)
        .forEach(tool => tool.onForceExit());
    }
};

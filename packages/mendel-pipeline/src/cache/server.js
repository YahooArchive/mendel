/* Copyright 2015-2016, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

const network = require('./network');
const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('mendel:net:server');
const error = require('debug')('mendel:net:server:error');
const verbose = require('debug')('verbose:mendel:net:server');

class CacheServer extends EventEmitter {
    constructor(config, cacheManager) {
        super();

        this.config = config;
        this._types = config.types;

        this.clients = [];

        this.cacheManager = cacheManager;
        this.initCache();

        network.getServer(config.cacheConnection)
        .then(server => {
            this.server = server;
            this.initServer();

            debug('listening', config.cacheConnection);
            this.emit('ready');
        }).catch(err => {
            debug('Cache server could not come up', err);
        });
    }

    isReady() {
        return !!this.server;
    }

    onExit() {
        if (this.server)
            this.server.close();
    }

    onForceExit() {
        if (this.server)
            this.server.close();
    }

    send(client, data) {
        if (client.destroyed) return;
        try {
            client.send(data);
        } catch (e) {
            console.log(e.stack);
        }
    }

    initServer() {
        this.server.on('error', (e) => {
            console.log('Mendel Server Errored');
            console.log(e.stack);
            process.exit(1);
        });
        this.server.on('listening', () => this.emit('ready'));

        this.server.on('connection', (client) => {
            debug(`[${this.clients.length}] A client connected`);
            this.clients.push(client);
            client.on('close', () => {
                this.clients.splice(this.clients.indexOf(client), 1);
                debug(`[${this.clients.length}] A client disconnected`);
            });
            client.on('error', () => {});

            client.on('data', (data) => {
                try {
                    data = typeof data === 'object' ? data : JSON.parse(data);
                } catch(e) {
                    error(e);
                }
                if (!data || !data.type) return;

                switch (data.type) {
                    case 'bootstrap':
                        {
                            this.emit('environmentRequested', data.environment);
                            client.environment = data.environment;
                            this.bootstrap(client);
                            break;
                        }
                    default:
                        return;
                }
                this.send(client, data);
            });
        });
    }

    initCache() {
        this.cacheManager.on('doneEntry', (cache, entry) => {
            const size = cache.size();
            this.clients
                .filter(c => c.environment === cache.environment)
                .forEach(c => this._sendEntry(c, size, entry));
        });
        this.cacheManager.on('entryRemoved', (cache, entryId) => {
            this.clients
                .filter(client => client.environment === cache.environment)
                .forEach(client => this._signalRemoval(client, entryId));
        });
        this.cacheManager.on('entryErrored', (cache, desc) => {
            this.clients
                .filter(client => client.environment === cache.environment)
                .forEach(client => this._signalError(client, desc));
        });
    }

    bootstrap(client) {
        const cache = this.cacheManager.getCache(client.environment);
        cache.entries()
            .filter(entry => entry.done)
            .forEach(entry => this._sendEntry(client, cache.size(), entry));
    }

    serializeEntry(entry) {
        const {
            deps, source, map, type, runtime,
            rawSource, id, normalizedId,
        } = entry;

        let variation = this.getVariationForEntry(entry);
        if (!variation) {
            variation = this.config.variationConfig.baseVariation;
        }
        variation = variation.chain[0];

        return {
            id, normalizedId,
            // Metadata
            variation, type, runtime,
            // Dependency information
            // FIXME currently only puts dependencies in browser runtime
            deps,
            // Important source data
            source, map, rawSource,
        };
    }

    getVariationForEntry(entry) {
        const variations = this.config.variationConfig.variations;
        return variations.find(({id}) => id === entry.variation);
    }

    _sendEntry(client, size, entry) {
        this.send(client, {
            totalEntries: size,
            type: 'addEntry',
            entry: this.serializeEntry(entry),
        });
        verbose('sent', entry.id);
    }

    _signalRemoval(client, id) {
        const cache = this.cacheManager.getCache(client.environment);
        this.send(client, {
            totalEntries: cache.size(),
            type: 'removeEntry',
            id,
        });
    }

    _signalError(client, {id, error}) {
        this.send(client, {
            error,
            type: 'errorEntry',
            id,
        });
    }
}

module.exports = CacheServer;

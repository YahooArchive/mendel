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

        this.server = network.getServer(config.cacheConnection);
        this.initServer();

        debug('listening', config.cacheConnection);
    }

    onExit() {
        this.server.close();
    }

    onForceExit() {
        this.server.close();
    }

    initServer() {
        this.server.on('listening', () => this.emit('ready'));
        this.server.on('connection', (client) => {
            debug(`[${this.clients.length}] A client connected`);
            this.clients.push(client);
            client.on('end', () => {
                this.clients.splice(this.clients.indexOf(client), 1);
                debug(`[${this.clients.length}] A client disconnected`);
            });

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
                client.send(data);
            });
        });
    }

    initCache() {
        this.cacheManager.on('doneEntry', (cache, entry) => {
            this.clients
                .filter(client => client.environment === cache.environment)
                .forEach(client => this._sendEntry(client, cache.size(), entry));
        });
        this.cacheManager.on('entryRemoved', (cache, entryId) => {
            this.clients
                .filter(client => client.environment === cache.environment)
                .forEach(client => this.signalRemoval(client, entryId));
        });
    }

    bootstrap(client) {
        const cache = this.cacheManager.getCache(client.environment);
        const entries = cache.entries();
        entries.forEach(entry => this._sendEntry(client, cache.size(), entry));
    }

    _sendEntry(client, size, entry) {
        if (client.destroyed) return;
        client.send({
            totalEntries: size,
            type: 'addEntry',
            entry: this.serializeEntry(entry),
        });
        verbose('sent', entry.id);
    }

    serializeEntry(entry) {
        const type = entry.getTypeForConfig(this.config);
        const {deps, source, map, runtime, rawSource, id, normalizedId} = entry;

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

    signalRemoval(client, id) {
        const cache = this.cacheManager.getCache(client.environment);
        try {
            if (!client.destroyed) return;
            client.send({
                totalEntries: cache.size(),
                type: 'removeEntry',
                id,
            });
        } catch(e) {
            error(e);
            this.emit('error', e);
        }
    }
}

module.exports = CacheServer;

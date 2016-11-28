/* Copyright 2015, Yahoo Inc.
   Designed by Stephan Lee
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

const network = require('./network');
const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('mendel:net:server');
const error = require('debug')('mendel:net:server:error');
const verbose = require('debug')('verbose:mendel:net:server');

class CacheServer extends EventEmitter {
    constructor(config, cache) {
        super();

        this.config = config;
        this._types = config.types;

        this.clients = [];

        this.cache = cache;
        this.initCache();

        this.server = network.getServer(config.cachePort);
        this.initServer();

        debug('listening', config.cachePort);
    }

    initServer() {
        this.server.on('listening', () => this.emit('ready'));
        this.server.on('connection', (client) => {
            debug('client connected');
            this.clients.push(client);
            client.on('end', () => {
                this.clients.splice(this.clients.indexOf(client), 1);
                debug('client disconnected');
                debug(this.clients.length, 'clients remaining');
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
        this.cache.on('doneEntry', entry => this.sendEntry(entry));
        this.cache.on('entryRemoved', id => this.signalRemoval(id));
    }

    bootstrap(client) {
        const entries = this.cache.entries();
        entries.forEach(entry => this._sendEntry(client, entry));
    }

    sendEntry(entry) {
        try {
            this.clients.forEach(client => this._sendEntry(client, entry));
        } catch(e) {
            error(e);
            this.emit('error', e);
        }
    }

    _sendEntry(client, entry) {
        if (-1 === entry.done.indexOf(client.environment)) {
            return;
        }
        client.send({
            totalEntries: this.cache.size(),
            type: 'addEntry',
            entry: this.serializeEntry(entry),
        });
        verbose('sent', entry.id);
    }

    // TODO: duplicate of registry/index.js
    getTransformIdsByType(typeName) {
        const type = this._types.find(({name}) => typeName === name);
        if (!type) return ['raw'];

        return ['raw'].concat(type.transforms);
    }

    serializeEntry(entry) {
        const type = entry.getTypeForConfig(this.config);
        const transformIds = this.getTransformIdsByType(type);
        const deps = entry.getDependency(transformIds);
        const source = entry.getSource(transformIds);

        let variation = this.getVariationForEntry(entry);
        if (!variation) {
            variation = this.config.variationConfig.baseVariation;
        }
        variation = variation.chain[0];

        return {
            id: entry.id,
            normalizedId: entry.normalizedId,
            variation, type, deps, source,
        };
    }

    getVariationForEntry(entry) {
        const variations = this.config.variationConfig.variations;
        return variations.find(({id}) => id === entry.variation);
    }

    signalRemoval(id) {
        try {
            this.clients.forEach(client => client.send({
                totalEntries: this.cache.size(),
                type: 'removeEntry',
                id: id,
            }));
        } catch(e) {
            error(e);
            this.emit('error', e);
        }
    }
}

module.exports = CacheServer;

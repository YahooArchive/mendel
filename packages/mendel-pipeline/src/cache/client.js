/* Copyright 2015-2016, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

const network = require('./network');
const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('mendel:net:client');
const error = require('debug')('mendel:net:client:error');
const verbose = require('debug')('verbose:mendel:net:client');

class CacheClient extends EventEmitter {
    constructor({cacheConnection, environment}, registry) {
        super();

        this.registry = registry;
        this.environment = environment;

        this.connection = network.getClient(cacheConnection);
        this.initClient();
    }

    start() {
        if (this.connected) this.bootstrapConnection();
        else this.connection.once('connect', () => this.bootstrapConnection());
    }

    onExit() {
        this.connection.end();
    }

    onForceExit() {
        this.connection.end();
    }

    initClient() {
        this.connection.on('error', (err) => {
            this.emit('error', err);
        });
        this.connection.on('data', (data) => {
            try {
                data = JSON.parse(data);
            } catch(e) {
                error(e);
            }
            if (!data || !data.type) return;

            switch (data.type) {
                case 'addEntry':
                    {
                        this.registry.addEntry(data.entry);
                        verbose('got', data.entry.id);
                        if (typeof data.totalEntries === 'number') {
                            this.checkStatus(data.totalEntries);
                        }
                        break;
                    }
                case 'removeEntry':
                    {
                        if (this.sync) this.emit('unsync', data.id);
                        this.sync = false;
                        this.registry.removeEntry(data.id);
                        break;
                    }
                default:
                    break;
            }
        });

        this.connection.on('connect', () => this.connected = true);
        this.connection.on('end', () => {
            debug('Disconnected from the master');
        });
    }

    bootstrapConnection() {
        // Request for all entries for warming the cache.
        this.connection.send({
            type: 'bootstrap',
            environment: this.environment,
        });
    }

    checkStatus(total) {
        if (this.registry.size === total && !this.sync) {
            this.sync = true;
            this.emit('sync');
            debug(`${this.registry.size} in sync with server`);
        }
    }
}

module.exports = CacheClient;

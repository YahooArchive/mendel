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

        this.cacheConnection = cacheConnection;
        this.connected = false;
        this.synced = false;
        this.closeReqeusted = false;
        this.connect();
    }

    start() {
        if (this.connected) this.bootstrapConnection();
        else this.connection.once('connect', () => this.bootstrapConnection());
    }

    onExit() {
        this.closeReqeusted = true;
        this.connection.end();
    }

    onForceExit() {
        this.closeReqeusted = true;
        this.connection.end();
    }

    connect(isRetry=false) {
        const conn = network.getClient(this.cacheConnection);
        this.connection = conn;
        conn.on('error', (err) => !isRetry && this.emit('error', err));
        conn.on('data', (data) => {
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
                        const unsynced = this.synced ? true : false;
                        this.synced = false;
                        this.registry.removeEntry(data.id);
                        if (unsynced) this.emit('unsync', data.id);
                        break;
                    }
                default:
                    break;
            }
        });

        conn.on('connect', () => {
            this.connected = true;
            if (isRetry) {
                console.log('[Mendel] Reconnected to daemon. Good to go!');
            }
        });

        conn.on('close', () => {
            if (!isRetry) this.emit('unsync');
            this.registry.clear();
            this.synced = false;

            debug('Disconnected from master');
            // User intentionally closed. Do not print or retry to connect
            if (this.closeReqeusted) return;

            if (!isRetry) {
                console.log([
                    '[Mendel] Daemon was disconnected.',
                    'Will try to reconnect...',
                ].join(' '));
            }

            setTimeout(() => {
                this.connect(true);
                this.start();
            }, 5000);
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
        if (this.registry.size === total && !this.synced) {
            debug(`${this.registry.size} entries are synced with a server`);
            this.synced = true;
            this.emit('sync');
        }
    }
}

module.exports = CacheClient;

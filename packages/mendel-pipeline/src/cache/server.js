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
    constructor({cachePort}, cache) {
        super();

        this.clients = [];

        this.cache = cache;
        this.initCache();

        this.server = network.getServer(cachePort);
        this.initServer();
        debug('listening', cachePort);
    }

    initServer() {
        this.server.on('listening', () => this.emit('ready'));
        this.server.on('connection', (client) => {
            debug('client connected');
            this.clients.push(client);
            client.on('end', () => {
                this.clients.splice(this.clients.indexOf(client), 1);
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
                            this.bootstrap(client);
                            this.emit('environmentRequested', data.environment);
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
        entries.forEach(entry => client.send({
            type: 'addEntry',
            entry: entry.serialize(),
        }));
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
        client.send({
            type: 'addEntry',
            entry: entry.serialize(),
        });
        verbose('sent', entry.id);
    }

    signalRemoval(id) {
        try {
            this.clients.forEach(client => client.send({
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

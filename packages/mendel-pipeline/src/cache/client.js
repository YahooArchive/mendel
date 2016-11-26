/* Copyright 2015, Yahoo Inc.
   Designed by Stephan Lee
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

const network = require('./network');
const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('mendel:net:client');
const error = require('debug')('mendel:net:client:error');
const verbose = require('debug')('verbose:mendel:net:client');

class CacheClient extends EventEmitter {
    constructor({cachePort, environment}) {
        super();

        this.cache = new Map();
        this.environment = environment;
        // this.initCache();

        this.connection = network.getClient(cachePort);
        this.initClient();
    }

    initClient() {
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
                        this.cache.set(data.entry.id, data.entry);
                        verbose('got', data.entry.id);
                        break;
                    }
                case 'removeEntry':
                    {
                        this.cache.delete(data.entry.id);
                        break;
                    }
                default:
                    break;
            }

            if (typeof data.totalEntries === 'number') {
                this.checkStatus(data.totalEntries);
            }
        });


        this.connection.on('connect', () => this.bootstrapConnection());
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
        if (this.cache.size === total) {
            this.emit('done');
            debug('DONE');
        }
    }

}

module.exports = CacheClient;

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

        this.cache = [];
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
                        const position = this.cache.findIndex(entry => {
                            return entry.id === data.id;
                        });
                        if (position !== -1) {
                            this.cache.splice(position, 1);
                        }
                        this.cache.push(data.entry);
                        verbose('got', data.entry);
                        break;
                    }
                case 'removeEntry':
                    {
                        const position = this.cache.findIndex(entry => {
                            return entry.id === data.id;
                        });
                        this.cache.splice(position, 1);
                        break;
                    }
                default:
                    return;
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

}

module.exports = CacheClient;

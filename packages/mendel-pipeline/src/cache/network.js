/* Copyright 2015, Yahoo Inc.
   Designed by Stephan Lee
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

const UnixSocket = require('./network/unix-socket');

function validate(options) {
    const {type} = options;
    if (type !== 'unix') {
        throw new Error(`[${type}] not supported.`);
    }
}

module.exports = {
    getServer(connectionOptions) {
        validate(connectionOptions);
        return Promise.resolve()
        .then(() => UnixSocket.getServer(connectionOptions))
        .then(server => {
            server.once('error', (err) => {
                console.error('[Mendel] Unrecoverable Server Error', err);
                process.exit(1);
            });
            return server;
        });
    },

    getClient(connectionOptions) {
        validate(connectionOptions);
        return UnixSocket.getClient(connectionOptions);
    },
};

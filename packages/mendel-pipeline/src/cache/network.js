/* Copyright 2015, Yahoo Inc.
   Designed by Stephan Lee
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

// Can use Websocket!
const net = require('net');

// Consistent API as WS or others this way.
const realWrite = net.Socket.prototype.write;
const realEmit = net.Socket.prototype.emit;
const CONTENT_DELIMITER = '\u0004';
let buffer = '';
net.Socket.prototype.send = function(str) {
    if (typeof str === 'object') str = JSON.stringify(str);
    this.write(str);
};

net.Socket.prototype.write = function(str) {
    // end of transmission
    realWrite.call(this, str + CONTENT_DELIMITER);
};

net.Socket.prototype.emit = function(name, content) {
    if (name !== 'data') return realEmit.apply(this, arguments);

    let delimitInd;
    while ((delimitInd = content.indexOf(CONTENT_DELIMITER)) >= 0) {
        realEmit.call(this, 'data', buffer + content.slice(0, delimitInd));
        content = content.slice(delimitInd + CONTENT_DELIMITER.length);
        buffer = '';
    }

    buffer += content;
};

module.exports = {
    getServer(connectionOptions) {
        const server = net.createServer().listen(connectionOptions);

        // nodemon style shutdown
        process.once('SIGUSR2', function() {
            gracefulShutdown(function() {
                process.kill(process.pid, 'SIGUSR2');
            });
        });
        process.on('exit', gracefulShutdown);
        server.on('connection', socket => socket.setEncoding('utf8'));

        function gracefulShutdown(callback) {
            server.close();
            callback && callback();
        }

        process.on('SIGINT', () => {
            // If you listen to the SIGINT, it will ignore "ctrl+c"'s default behavior
            // Send graceful exit so we close the server above
            process.exit(0);
        });

        return server;
    },
    getClient(connectionOptions) {
        const connection = net.connect(connectionOptions);
        connection.setEncoding('utf8');
        process.on('exit', () => connection.end());
        return connection;
    },
};

/* Copyright 2015, Yahoo Inc.
   Designed by Stephan Lee
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

// Can use Websocket!
const net = require('net');

function patchSocket(socket) {
    // Consistent API as WS or others this way.
    const realWrite = net.Socket.prototype.write;
    const realEmit = net.Socket.prototype.emit;
    const CONTENT_DELIMITER = '\u0004';
    let buffer = '';
    socket.send = function(str) {
        if (typeof str === 'object') str = JSON.stringify(str);
        this.write(str);
    };

    socket.write = function(str) {
        // end of transmission
        realWrite.call(this, str + CONTENT_DELIMITER);
    };

    socket.emit = function(name, content) {
        if (name !== 'data') return realEmit.apply(this, arguments);

        let delimitInd;
        while ((delimitInd = content.indexOf(CONTENT_DELIMITER)) >= 0) {
            realEmit.call(this, 'data', buffer + content.slice(0, delimitInd));
            content = content.slice(delimitInd + CONTENT_DELIMITER.length);
            buffer = '';
        }

        buffer += content;
    };
}

module.exports = {
    getServer(connectionOptions) {
        const server = net.createServer().listen(connectionOptions);

        // // nodemon style shutdown
        process.once('SIGUSR2', function() {
            gracefulShutdown(function() {
                process.kill(process.pid, 'SIGUSR2');
            });
        });
        process.on('mendelExit', gracefulShutdown);
        server.on('connection', socket => {
            patchSocket(socket);
            socket.setEncoding('utf8');
        });

        function gracefulShutdown(callback) {
            server.close();
            typeof callback === 'function' && callback();
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
        patchSocket(connection);
        connection.setEncoding('utf8');
        process.on('mendelExit', () => connection.end());
        return connection;
    },
};

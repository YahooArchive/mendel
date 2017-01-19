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
        let isClosed = false;
        let close = server.close;

        server.on('connection', socket => {
            patchSocket(socket);
            socket.setEncoding('utf8');
        });
        server.on('close', () => isClosed = true);
        server.close = function closeHelper() {
            if (isClosed) return;
            close.call(server);
        };
        server.on('error', () => {
            const serverPath = connectionOptions.path ||
                `${connectionOptions.host}:${connectionOptions.port}`;
            console.error([
                'Server cannot start when another server is active.',
                '\nIf no server process is active, please remove or kill',
                `"${serverPath}" manually.`,
                '\nThis is a symptom of server process exiting preemptively.',
            ].join(' '));
            process.exit(1);
        });

        return server;
    },

    getClient(connectionOptions) {
        const connection = net.connect(connectionOptions);
        patchSocket(connection);
        connection.setEncoding('utf8');
        return connection;
    },
};

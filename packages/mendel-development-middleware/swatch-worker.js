/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var EventEmitter = require('events').EventEmitter;
var fork = require('child_process').fork;
var xtend = require('xtend');
var Swatch = require('./swatch');

if (isWorker()) {
    start();
}

var ids = 0;

function start() {
    var watcher;

    // forward swatch events to parent process
    function notifyParent(event) {
        watcher.on(event, function() {
            var args = Array.prototype.slice.call(arguments);
            process.send({event: event, args: args});
        });
    }

    process.on('message', function(msg) {
        switch(msg.cmd) {
        case 'start':
            watcher = new Swatch(msg.opts);

            // events to forward
            var events = [
                'changed',
                'removed',
                'ready',
                'error'
            ];
            events.forEach(notifyParent);

            watcher.watch();
            break;

        case 'stop':
            watcher.stop();
            break;

        default:
            console.warn('Invalid command: ' + msg.cmd);
        }
    });
}

function isWorker() {
    return 'MENDEL_SWATCH_WORKER_ID' in process.env;
}

module.exports.fork = function(opts) {
    opts = opts || {};

    var worker = fork(__filename, {
        env: xtend({}, process.env, {MENDEL_SWATCH_WORKER_ID: ids++})
    });

    var workerEvents = new EventEmitter();

    workerEvents.on('error', function(err) {
        console.error(err);
    });

    // we 'forward' the changed an remove events
    // so changes are removed from the parent process require cache
    workerEvents.on('changed', function(changes) {
        changes.files.forEach(function(files) {
            Swatch.prototype.uncacheModule.call(null, files.dest);
        });
    });

    workerEvents.on('removed', function(src, dest) {
        // worker takes care of the actual file unlink
        // this just clears require cache on parent process
        Swatch.prototype.uncacheModule.call(null, dest);
    });

    worker.on('message', function(msg) {
        var args = msg.args;
        args.unshift(msg.event);
        workerEvents.emit.apply(workerEvents, args);
    });

    worker.send({cmd: 'start', opts: opts});

    return {
        on: workerEvents.on.bind(workerEvents),
        stop: function() {
            worker.send({cmd: 'stop'});
            worker.kill();
        }
    }
}

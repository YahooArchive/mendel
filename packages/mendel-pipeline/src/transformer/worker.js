const analytics = require('../helpers/analytics/analytics-worker')('transform');
const analyticsIpc = require('../helpers/analytics/analytics-worker')('ipc');
const debug = require('debug')('mendel:transformer:slave-' + process.pid);

debug(`[Slave ${process.pid}] online`);

process.on('message', ({type, transforms, source, filename}) => {
    if (type === 'start') {
        debug(`[Slave ${process.pid}] Starting transform.`);

        if (transforms.length === 0) {
            return Promise.reject(`${filename} was transformed with nothing.`);
        }

        let promise = Promise.resolve({source});

        transforms.forEach(transform => {
            promise = promise
            .then(analytics.tic.bind(analytics, transform.id))
            .then(({source}) => {
                const xform = require(transform.plugin);
                return xform({filename, source}, transform.options);
            })
            .then(analytics.toc.bind(analytics, transform.id))
            .then(result => {
                debug(`[Slave ${process.pid}][${transform.id}] "${filename}" transformed`);
                return result;
            }).catch(err => {
                throw err;
            });
        });

        promise.then(({source, map}) => {
            debug(`[Slave ${process.pid}] Transform done.`);
            analyticsIpc.tic('transform');
            process.send({type: 'done', filename, source, map});
            analyticsIpc.toc('transform');
        })
        .catch(error => {
            console.log(error.stack);
            debug(`[Slave ${process.pid}] Transform errored.`);
            process.send({type: 'error', filename, error: error.message});
        });
    } else if (type === 'exit') {
        debug(`[Slave ${process.pid}] Instructed to exit.`);
        process.exit(0);
    }
});

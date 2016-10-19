const debug = require('debug')('mendel:ift-slave-' + process.pid);

debug(`[Slave ${process.pid}] online`);

process.on('message', ({type, transforms, source, filename}) => {
    if (type === 'start') {
        debug(`[Slave ${process.pid}] Starting transform.`);

        let promise = Promise.resolve();

        transforms.forEach(transform => {
            promise = promise.then(() => {
                const xform = require(transform.plugin);
                return xform({filename, source}, transform.options);
            }).then(result => {
                debug(`[Slave ${process.pid}] transform (${transform.plugin}) done`);
                return result;
            });
        });

        promise.then(({source, map}) => {
            debug(`[Slave ${process.pid}] Transform done.`);
            process.send({type: 'done', filename, source, map});
        })
        .catch(error => {
            debug(`[Slave ${process.pid}] Transform errored.`);
            process.send({type: 'error', filename, error: error.message});
        });
    } else if (type === 'exit') {
        debug(`[Slave ${process.pid}] Instructed to exit.`);
        process.exit(0);
    }
});

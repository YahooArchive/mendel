const debug = require('debug')('mendel:deps:slave-' + process.pid);
const dep = require('mendel-deps');

debug(`[Slave ${process.pid}] online`);

process.on('message', ({type, cwd, filePath, source}) => {
    if (type === 'start') {
        dep(cwd, filePath, source)
        .then((deps) => {
            debug(`Dependencies found.`);
            process.send({type: 'done', filePath, deps});
        })
        .catch(error => {
            debug(`Errored while finding dependencies: "${filePath}" - ${error.stack}`);
            process.send({type: 'error', filePath, error: error.message});
        });
    } else if (type === 'exit') {
        debug(`Instructed to exit.`);
        process.exit(0);
    }
});

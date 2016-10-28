const debug = require('debug')('mendel:deps:slave-' + process.pid);
const dep = require('mendel-deps');
const VariationalResolver = require('mendel-deps/src/resolver/variational-resolver');
const path = require('path');
debug(`[Slave ${process.pid}] online`);

process.on('message', ({type, filePath, source, cwd, baseDir, varsDir}) => {
    if (type === 'start') {
        const resolver = new VariationalResolver({
            cwd,
            envNames: ['main', 'browser'],
            basedir: path.resolve(cwd, path.dirname(filePath)),
            baseVariationDir: baseDir,
            variationsDir: varsDir,
        });

        debug(`Detecting dependencies for ${filePath}`);
        dep({source, resolver})
        .then((deps) => {
            debug(`Dependencies for ${filePath} found!`);
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

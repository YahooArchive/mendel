const debug = require('debug')('mendel:deps:slave-' + process.pid);
const dep = require('mendel-deps');
const path = require('path');
const VariationalResolver = require('mendel-resolver/variational-resolver');

debug(`[Slave ${process.pid}] online`);

process.on('message', ({type, filePath, source, variation, cwd, baseDir, baseName, varsDir}) => {
    if (type === 'start') {
        debug(`Detecting dependencies for ${filePath}`);

        const resolver = new VariationalResolver({
            cwd,
            envNames: ['main', 'browser'],
            basedir: path.resolve(cwd, path.dirname(filePath)),
            baseVariationDir: baseDir,
            variationsDir: varsDir,
            variations: [variation, baseName],
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

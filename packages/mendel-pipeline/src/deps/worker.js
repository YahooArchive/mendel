const analytics = require('../helpers/analytics/analytics-worker')('deps');
const analyticsIpc = require('../helpers/analytics/analytics-worker')('ipc');
const debug = require('debug')('mendel:deps:slave-' + process.pid);
const dep = require('mendel-deps');
const path = require('path');
const VariationalResolver = require('mendel-resolver/variational-resolver');

debug(`[Slave ${process.pid}] online`);

process.on('message', ({type, filePath, source, variation, projectRoot, baseDir, baseName, varDirs}) => {
    if (type === 'start') {
        debug(`Detecting dependencies for ${filePath}`);

        analytics.tic();
        const resolver = new VariationalResolver({
            projectRoot,
            envNames: ['main', 'browser'],
            basedir: path.resolve(projectRoot, path.dirname(filePath)),
            baseVariationDir: baseDir,
            variationDirs: varDirs,
            variations: [variation, baseName],
        });

        debug(`Detecting dependencies for ${filePath}`);
        dep({source, resolver})
        .then((deps) => {
            analytics.toc();
            debug(`Dependencies for ${filePath} found!`);
            analyticsIpc.tic('deps');
            process.send({type: 'done', filePath, deps});
            analyticsIpc.toc('deps');
        })
        .catch(error => {
            console.error(error.stack);
            debug(`Errored while finding dependencies: "${filePath}" - ${error.stack}`);
            process.send({type: 'error', filePath, error: error.message});
        })
        .catch(err => {
            console.error(err.stack);
        });
    } else if (type === 'exit') {
        debug(`Instructed to exit.`);
        process.exit(0);
    }
});

// Copyright (c) 2013 Titanium I.T. LLC. Licensed under the MIT license.
// Forked from karma-commonjs
/* eslint max-len: "off" */
var path = require('path');
var os = require('os');
var configLoader = require('mendel-config');
var MendelClient = require('mendel-pipeline/client');

var INLINE_MAP_PREFIX = '//# sourceMappingURL=data:application/json;base64,';
var BRIDGE_FILE_PATH = path.normalize(
    __dirname + '/../client/commonjs_bridge.js'
);

var globalClient;
var globalConfig;

var initCommonJS = function(logger, emitter, configMendel, configFiles) {
    var log = logger.create('framework.mendel');
    var client = new MendelClient(
        Object.assign({}, configMendel, {noout: true})
    );
    client.run();
    var config = configLoader(configMendel);
    globalConfig = config;
    globalClient = client;

    log.debug('Found mendel config at "%s".', config.projectRoot);

    // Include the file that resolves all the dependencies on the client.
    configFiles.push({
        pattern: BRIDGE_FILE_PATH,
        included: true,
        served: true,
        watched: false,
    });

    var root = config.projectRoot;

    emitter.on('file_list_modified', function(files) {
        // karma will swallow errors without this try/catch
        try {
            var modules = files.included
                .map(_ => path.relative(root, _.originalPath))
                .map(_ => client.registry.getEntry('./' + _))
                .filter(Boolean);

            log.debug(modules.map(_ => _.normalizedId));

            var collectedModules = new Map();

            modules.forEach(module => {
                client.registry.walk(
                    module.normalizedId,
                    {types: config.types.map(_ => _.name)},
                    dep => {
                        if (collectedModules.has(dep.id)) return false;
                        collectedModules.set(dep.id, dep);
                    }
                );
            });

            var servedFiles = files.served;
            files.included = Array.from(collectedModules.values()).map(mod => {
                var filepath = path.join(root, mod.id);
                for (var i = 0, length = servedFiles.length; i < length; i++) {
                    if (
                        servedFiles[i].originalPath ===
                        path.join(root, filepath)
                    ) {
                        return servedFiles[i];
                    }
                }

                var externalFile = {
                    path: filepath,
                    originalPath: filepath,
                    contentPath: filepath,
                    isUrl: false,
                    mtime: new Date(),
                };

                files.served.push(externalFile);
                return externalFile;
            });
        } catch (e) {
            log.error(e);
        }
    });
};

initCommonJS.$inject = ['logger', 'emitter', 'config.mendel', 'config.files'];

var createPreprocesor = function(logger) {
    var log = logger.create('preprocessor.mendel');

    return function getFile(content, file, done, logged) {
        var relativeFile =
            './' + path.relative(globalConfig.projectRoot, file.originalPath);
        logged !== 'logged' && log.debug('Processing "%s".', relativeFile);

        if (!globalClient.isSynced()) {
            return setTimeout(
                () => getFile(content, file, done, 'logged'),
                500
            );
        }

        if (file.originalPath === BRIDGE_FILE_PATH) {
            return done(content);
        }

        var module = globalClient.registry.getEntry(relativeFile);

        if (!module) {
            return done(content);
        }
        log.warn(relativeFile, 'transformed');

        var transformedContent = !module.map
            ? module.source
            : [
                  module.source,
                  '\n',
                  INLINE_MAP_PREFIX,
                  new Buffer(JSON.stringify(module.map)).toString('base64'),
              ].join('');

        var output =
            'window.__cjs_modules_root__ = "' +
            globalConfig.projectRoot +
            '";' +
            'window.__cjs_module__ = window.__cjs_module__ || {};' +
            'window.__cjs_module__["' +
            file.originalPath +
            '"] = function(require, module, exports, __dirname, __filename) {' +
            transformedContent +
            os.EOL +
            '}';

        done(output);
    };
};
createPreprocesor.$inject = ['logger'];

// PUBLISH DI MODULE
module.exports = {
    'framework:mendel': ['factory', initCommonJS],
    'preprocessor:mendel': ['factory', createPreprocesor],
};

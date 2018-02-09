// Copyright (c) 2013 Titanium I.T. LLC. Licensed under the MIT license.
// Forked from karma-commonjs
/* eslint max-len: "off" */
var path = require('path');
var os = require('os');
var configLoader = require('mendel-config');
var MendelClient = require('mendel-pipeline/client');

var INLINE_MAP_PREFIX = '//# sourceMappingURL=data:application/json;base64,';
var BRIDGE_FILE_PATH = path.normalize(__dirname + '/../client/commonjs_bridge.js');

var initCommonJS = function( /* config.files */ files) {

    // Include the file that resolves all the dependencies on the client.
    files.push({
        pattern: BRIDGE_FILE_PATH,
        included: true,
        served: true,
        watched: false,
    });
};

var createPreprocesor = function(logger, options) {
    var log = logger.create('preprocessor.mendel');
    var client = new MendelClient(Object.assign({}, options, {noout: true}));
    client.run();
    var config = configLoader(options);

    log.debug('Found mendel config at "%s".', config.projectRoot);

    return function getFile(content, file, done, logged) {
        var relativeFile = './' + path.relative(config.projectRoot, file.originalPath);
        logged !== 'logged' && log.debug('Processing "%s".', relativeFile);

        if (!client.isSynced()) {
            return setTimeout(() => getFile(content, file, done, 'logged'), 500);
        }


        if (file.originalPath === BRIDGE_FILE_PATH) {
            return done(content);
        }

        var module = client.registry.getEntry(relativeFile);

        if (!module) {
            return done(content);
        }

        var transformedContent = !module.map ? module.source : [
            module.source,
            '\n',
            INLINE_MAP_PREFIX,
            new Buffer(JSON.stringify(module.map)).toString('base64'),
        ].join('');

        var output =
            'window.__cjs_modules_root__ = "' + config.projectRoot + '";' +
            'window.__cjs_module__ = window.__cjs_module__ || {};' +
            'window.__cjs_module__["' + file.originalPath + '"] = function(require, module, exports, __dirname, __filename) {' +
            transformedContent + os.EOL +
            '}';

        done(output);
    };
};
createPreprocesor.$inject = ['logger', 'config.mendelOptions'];

// PUBLISH DI MODULE
module.exports = {
    'framework:mendel': ['factory', initCommonJS],
    'preprocessor:mendel': ['factory', createPreprocesor],
};

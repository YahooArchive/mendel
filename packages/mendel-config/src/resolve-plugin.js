var nodeResolveSync = require('resolve').sync;
var path = require('path');

function resolvePlugin(pluginName, basedir) {
    const pluginPackagePath = _resolve(path.join(pluginName, 'package.json'), {
        basedir,
    });
    const pluginPath = _resolve(pluginName, {basedir});

    const resolved = {
        plugin: pluginPath,
    };

    resolved.mode = [pluginPackagePath, pluginPath].reduce((mode, path) => {
        if (!mode) {
            try {
                const packageOrModule = require(path);
                mode = packageOrModule.mode || 'ist';
            } catch (e) {
                // Nice try, but we don't need to do anything yet
                // ¯\_(ツ)_/¯
            }
        }
        return mode;
    }, false);

    resolved.mode = resolved.mode || 'unknown';

    if (resolved.mode === 'unknown' && process.env.NODE_ENV !== 'production') {
        console.error(
            'WARN: ' + pluginName + ' was not found. Check your configuration '+
            'or your "npm install --save-dev" your plugin'
        );
    }

    return resolved;
}

function _resolve(pluginPath, opt) {
    try {
        return nodeResolveSync(pluginPath, opt);
    } catch (e) {
        return false;
    }
}

module.exports = resolvePlugin;

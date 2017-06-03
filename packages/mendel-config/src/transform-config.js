var createValidator = require('./validator');
var nodeResolveSync = require('resolve').sync;
var path = require('path');

function _resolve(pluginPath, opt) {
    try {
        return nodeResolveSync(pluginPath, opt);
    } catch (e) {
        return false;
    }
}


function TransformConfig(id, transform, {projectRoot}) {
    this.id = id;
    const basedir = projectRoot;
    const pluginPackagePath = _resolve(path.join(transform.plugin, 'package.json'), {basedir});
    const pluginPath = _resolve(transform.plugin, {basedir});

    if (pluginPath) {
        this.mode = [pluginPackagePath, pluginPath]
            .filter(Boolean)
            .map(plugin => require(plugin).mode)
            .filter(Boolean)[0] || 'ist';
    } else {
        this.mode = 'unknown';
    }

    this.plugin = pluginPath;
    this.options = transform.options;

    TransformConfig.validate(this);
}

TransformConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
    mode: {required: true},
});

module.exports = TransformConfig;

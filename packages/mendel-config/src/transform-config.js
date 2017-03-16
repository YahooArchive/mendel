var createValidator = require('./validator');
var nodeResolveSync = require('resolve').sync;

function TransformConfig(id, transform, {projectRoot}) {
    this.id = id;

    try {
        this.plugin = nodeResolveSync(transform.plugin, {basedir: projectRoot});
        this.mode = require(this.plugin).mode || 'ist';
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') throw e;
        this.plugin = false;
        this.mode = 'unknown';
    }

    this.options = transform.options;

    TransformConfig.validate(this);
}

TransformConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
    mode: {required: true},
});

module.exports = TransformConfig;

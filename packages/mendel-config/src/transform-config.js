var createValidator = require('./validator');
var moduleResolveSync = require('resolve').sync;

function TransformConfig(id, transform, {projectRoot}) {
    this.id = id;

    this.plugin = moduleResolveSync(transform.plugin, {basedir: projectRoot});
    this.mode = require(this.plugin).mode || 'ist';

    this.options = transform.options;

    TransformConfig.validate(this);
}

TransformConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
    mode: {required: true},
});

module.exports = TransformConfig;

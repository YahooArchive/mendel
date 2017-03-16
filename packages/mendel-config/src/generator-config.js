var createValidator = require('./validator');
var nodeResolve = require('resolve').sync;

function GeneratorConfig({id, plugin}, {projectRoot}) {
    this.id = id;
    try {
        this.plugin = nodeResolve(plugin, {basedir: projectRoot});
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') throw e;
        this.plugin = false;
    }

    GeneratorConfig.validate(this);
}

GeneratorConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
});

module.exports = GeneratorConfig;

var createValidator = require('./validator');
var moduleResolveSync = require('resolve').sync;

function GeneratorConfig({id, plugin}, {projectRoot}) {
    console.log(arguments[0]);
    this.id = id;
    this.plugin = moduleResolveSync(plugin, {basedir: projectRoot});

    GeneratorConfig.validate(this);
}

GeneratorConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
});

module.exports = GeneratorConfig;

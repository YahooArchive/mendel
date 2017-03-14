var createValidator = require('./validator');
var moduleResolveSync = require('resolve').sync;

function PostGeneratorConfig(options, {projectRoot}) {
    const {id, plugin} = options;
    this.id = id;
    this.plugin = moduleResolveSync(plugin, {basedir: projectRoot});
    this.options = options;

    PostGeneratorConfig.validate(this);
}

PostGeneratorConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
});

module.exports = PostGeneratorConfig;

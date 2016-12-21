var createValidator = require('./validator');
var moduleResolveSync = require('resolve').sync;

function OutletConfig({id, plugin}, {projectRoot}) {
    this.id = id;
    this.plugin = moduleResolveSync(plugin, {basedir: projectRoot});

    OutletConfig.validate(this);
}

OutletConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
});

module.exports = OutletConfig;

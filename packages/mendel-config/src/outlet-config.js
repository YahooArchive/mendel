var createValidator = require('./validator');
var moduleResolveSync = require('resolve').sync;

function OutletConfig({id, plugin, options={}}, {projectRoot}) {
    this.id = id;
    this._plugin = plugin;
    this.plugin = moduleResolveSync(plugin, {basedir: projectRoot});
    this.options = options;

    if (this.options.plugin) {
        if (!Array.isArray(this.options.plugin)) {
            throw new Error(`Expect 'options.plugin' to be an Array.`); // eslint-disable-line
        }
        this.options.plugin = this.options.plugin.map((plugin, index) => {
            if (typeof plugin !== 'string' && !Array.isArray(plugin)) {
                throw new Error(`Expect 'options.plugin[${index}]' to be a String or an Array.`); // eslint-disable-line
            }

            if (typeof plugin === 'string')
                return moduleResolveSync(plugin, {basedir: projectRoot});

            plugin[0] = moduleResolveSync(plugin[0], {basedir: projectRoot});
            return plugin;
        });
    }

    OutletConfig.validate(this);
}

OutletConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
});

module.exports = OutletConfig;

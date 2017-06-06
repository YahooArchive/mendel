var createValidator = require('./validator');
var resolvePlugin = require('./resolve-plugin');

function OutletConfig({id, plugin, options={}}, {projectRoot}) {
    this.id = id;
    this._plugin = plugin;
    this.options = options;

    this.plugin = resolvePlugin(plugin, projectRoot).plugin;

    if (this.options.plugin) {
        if (!Array.isArray(this.options.plugin)) {
            throw new Error(`Expect 'options.plugin' to be an Array.`); // eslint-disable-line
        }
        this.options.plugin = this.options.plugin.map((plugin, index) => {
            if (typeof plugin !== 'string' && !Array.isArray(plugin)) {
                throw new Error(`Expect 'options.plugin[${index}]' to be a String or an Array.`); // eslint-disable-line
            }

            if (typeof plugin === 'string')
                return resolvePlugin(plugin, projectRoot).plugin;

            plugin[0] = resolvePlugin(plugin[0], projectRoot).plugin;
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

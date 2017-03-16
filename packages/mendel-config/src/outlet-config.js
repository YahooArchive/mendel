var createValidator = require('./validator');
var nodeResolve = require('resolve').sync;

function resolve(plugin, root) {
    try {
        return nodeResolve(plugin, {basedir: root});
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') return false;
        throw e;
    }
}

function OutletConfig({id, plugin, options={}}, {projectRoot}) {
    this.id = id;
    this._plugin = plugin;
    this.plugin = resolve(plugin, projectRoot);
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
                return resolve(plugin, projectRoot);

            plugin[0] = resolve(plugin[0], projectRoot);
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

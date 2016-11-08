var path = require('path');
var createValidator = require('./validator');

function TransformConfig(id, options) {
    this.id = id;
    var plugin = options.plugin || '';
    this.plugin = path.extname(plugin) ? path.resolve(plugin) : plugin;
    this.options = options;

    TransformConfig.validate(this);
}

TransformConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
});

module.exports = TransformConfig;

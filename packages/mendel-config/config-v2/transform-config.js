var createValidator = require('./validator');

function TransformConfig(id, transform) {
    this.id = id;
    this.plugin = transform.plugin;
    this.options = transform.options;

    TransformConfig.validate(this);
}

TransformConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
});

module.exports = TransformConfig;

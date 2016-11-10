var path = require('path');
var createValidator = require('./validator');

function BaseConfig(config) {
    var baseConfig = config['base-config'];
    this.id = baseConfig.id;
    this.dir = path.resolve(config.cwd, baseConfig.dir || '');

    BaseConfig.validate(this);
}

BaseConfig.validate = createValidator({
    id: {required: true},
    dir: {required: true},
});

module.exports = BaseConfig;

var path = require('path');
var createValidator = require('./validator');

function VariationConfig(config) {
    var variationConfig = config['variation-config'];
    if (!variationConfig) return null;

    this.variationDirs = (variationConfig['variation-dirs'] || [])
        .filter(Boolean)
        .map(function(dir) { return path.resolve(config.cwd, dir); });
    this.variations = variationConfig.variations;

    VariationConfig.validate(this);
}

VariationConfig.validate = createValidator({
    variationDirs: {type: 'array', minLen: 1},
});

module.exports = VariationConfig;

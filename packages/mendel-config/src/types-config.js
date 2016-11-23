var createValidator = require('./validator');
var Minimatch = require('minimatch').Minimatch;

function TypesConfig(typeName, type) {
    this.name = typeName;

    // We ignore extensions if type declaration has both extensions and glob
    if (type.extensions && type.glob) {
        console.log([
            '[Config][WARN] Type declaration has both `extensions` and `glob`.',
            'Ignoring the `extensions`.',
        ].join(' '));
    }

    this.glob = (type.glob || ['./**/*{' + type.extensions.join(',') + '}'])
        .map(function(glob) { return new Minimatch(glob); });

    this.isBinary = type.isBinary || false;
    this.parser = type.parser;
    this.parserToType = type['parser-to-type'];
    this.transforms = type.transforms || [];
    this.outlet = type.outlet;

    TypesConfig.validate(this);
}

TypesConfig.validate = createValidator({
    glob: {type: 'array', minLen: 1},
});

module.exports = TypesConfig;

var createValidator = require('./validator');

function TypesConfig(typeName, type) {
    this.name = typeName;
    this.extensions = type.extensions;
    this.isBinary = type.isBinary || false;
    this.parser = type.parser;
    this.transforms = type.transforms;
    this.outlet = type.outlet;

    TypesConfig.validate(this);
}

TypesConfig.validate = createValidator({
    extensions: {type: 'array', minLen: 1},
});

module.exports = TypesConfig;

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

    if (!type.extensions && !type.glob) {
        throw new Error([
            `[Config][ERROR] Type declaration "${this.name}" requires either`,
            '`extensions` or `glob`.',
        ].join(' '));
    }

    // TODO: figure out how to test this properlly, the regular tap/match
    //       was not working well:
    const globStrings = type.glob ||
        type.extensions.map(function(ext) {
            return ext[0] !== '.' ? '.' + ext : ext;
        }).map(function(ext) {
            return './**/*' + ext;
        });
    const globs = this.globs = globStrings.map(function(glob) {
        return new Minimatch(glob);
    });

    this.test = function(id) {
        return globs.filter(({negate}) => !negate).some(g => g.match(id)) &&
            globs.filter(({negate}) => negate).every(g => g.match(id));
    };

    this.isBinary = type.isBinary || false;
    this.parser = type.parser;
    this.parserToType = type['parser-to-type'];
    this.transforms = type.transforms || [];

    TypesConfig.validate(this);
}

TypesConfig.validate = createValidator({
    globs: {type: 'array', minLen: 1},
    // transforms can be empty in case of simple outlet
});

module.exports = TypesConfig;

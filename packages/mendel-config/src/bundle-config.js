const createValidator = require('./validator');
const path = require('path');

function BundleConfig(id, options, config) {
    this.id = id;
    this.generator = options.generator || 'default';
    this.outfile = path.resolve(config.baseConfig.outdir, options.outfile);
    this.entries = flattenArrays(options.entries || []);
    this.require = flattenArrays(options.require || []);
    this.external = flattenArrays(options.external || []);
    this.outlet = options.outlet;

    this.options = without(
        options,
        ['generator', 'outfile', 'entries', 'require', 'external']
    );

    BundleConfig.validate(this);
}

BundleConfig.validate = createValidator({
    id: {required: true},
    outfile: {required: true},
});

function flattenArrays(inArray) {
    return inArray.reduce(function(arr, item) {
        if (!Array.isArray(item)) item = [item];
        return arr.concat(item);
    }, []);
}

function without(obj, withouts) {
    const cloned = JSON.parse(JSON.stringify(obj));

    withouts.forEach(function(property) {
        delete cloned[property];
    });

    return cloned;
}

module.exports = BundleConfig;

const createValidator = require('./validator');
const path = require('path');
const {undash} = require('./util');

function BundleConfig(id, options, config) {
    this.id = id;
    this.generator = options.generator || 'default';

    const {outdir} = config.baseConfig;

    this.outfile = options.outfile ?
        path.resolve(outdir, options.outfile) : '';

    if (options.manifest) {
        this.manifest = path.resolve(outdir, options.manifest);
    }

    this.entries = flattenArrays(options.entries || []);
    this.require = flattenArrays(options.require || []);
    this.external = flattenArrays(options.external || []);
    this.outlet = options.outlet;

    this.options = without(
        options,
        ['generator', 'outfile', 'outlet', 'entries', 'require', 'external']
    );

    this.options = undash(this.options);

    BundleConfig.validate(this);
}

BundleConfig.validate = createValidator({
    id: {required: true},
    supportedOptionFields: [
        'allBundles',
        'entries',
        'external',
        'from',
        'generator',
        'manifest',
        'outfile',
        'outlet',
        'require',
        'runtime',
        'sourcemap',
        'envify',
        'uglify',
        'serveAs',
    ],
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

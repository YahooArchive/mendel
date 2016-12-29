const Bundle = require('../../bundles/bundle');
const DefaultGenerator = require('../../bundles/default-generator');
const debug = require('debug')('mendel:generators');

class MendelGenerators {
    constructor(options, registry) {
        this.registry = registry;
        this.options = options;

        this.generators = options.generators.map(generator => {
            return Object.assign({}, generator, {
                plugin: require(generator.plugin),
            });
        });

        this.generators.unshift({
            id: 'default',
            plugin: DefaultGenerator,
        });

        this.bundles = options.bundles.map(opts => new Bundle(opts));

        // This orders generators to run in order of "generators" declaration
        // in the mendelrc
        this.plan = this.generators.map(generator => {
            return this.bundles.find(bundle => {
                return bundle.options.generator === generator.id;
            });
        }).filter(Boolean);

        debug('plan', this.plan);
    }

    perform() {
        const doneBundles = [];
        this.plan.forEach(bundle => {
            const {plugin} = this.generators.find(gen => {
                return gen.id === bundle.options.generator;
            });
            const resultBundle = plugin(
                bundle, doneBundles,
                this.registry, this.options
            );
            // TODO: real bundle validation, to be implemented in the Bundle
            // class, or alternativelly refactor bundle to POJO and use
            // validator right here instead.
            if (resultBundle && resultBundle.entries) {
                debug(resultBundle.entries.size);
                doneBundles.push(resultBundle);
            }
        });
        return this.doneBundles = doneBundles;
    }
}

module.exports = MendelGenerators;

const Bundle = require('./bundles/bundle');
const DefaultGenerator = require('./bundles/default-generator');
const debug = require('debug')('mendel:generators');

class MendelGenerators {
    constructor(options, registry) {
        this.registry = registry;

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
        this.plan();
    }

    plan() {
        let plan = [];
        this.generators.forEach(generator => {
            plan = plan.concat(this.bundles.filter(bundle => {
                return bundle.options.generator === generator.id;
            }));
        });
        debug('plan', plan);
        this.plan = plan;
    }

    perform() {
        const doneBundles = [];
        this.plan.forEach(bundle => {
            const plugin = this.generators.find(gen => {
                return gen.id === bundle.options.generator;
            }).plugin;
            const resultBundle = plugin(bundle, doneBundles, this.registry);
            // TODO: real bundle validation, to be implemented in the Bundle
            // class, or alternativelly refactor bundle to POJO and use
            // validator right here instead.
            if (resultBundle && resultBundle.entries) {
                debug(resultBundle.entries.size);
                doneBundles.push(resultBundle);
            }
        });
        this.doneBundles = doneBundles;
    }
}

module.exports = MendelGenerators;

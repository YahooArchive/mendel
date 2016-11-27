const Bundle = require('./bundles/bundle');
const debug = require('debug')('mendel:generators');

class MendelGenerators {
    constructor(options, cache) {
        this.cache = cache;

        this.generators = options.generators.map(generator => {
            generator.plugin = require(generator.plugin);
            return generator;
        });
        this.generators.unshift({
            id: 'default',
            plugin: this.defaultGenerator,
        });

        this.bundles = options.bundles.map(opts => new Bundle(opts));
        this.plan();
    }

    // TODO: make a module out of this
    defaultGenerator(bundle, doneBundles, registry) {
        console.log('defaultGenerator', bundle.id);
    }

    plan() {
        let plan = [];
        this.generators.forEach(generator => {
            plan = plan.concat(this.bundles.filter(bundle => {
                return bundle.generator === generator.id;
            }));
        });
        debug('plan', plan);
        this.plan = plan;
    }

    perform() {
        const doneBundles = [];
        this.plan.forEach(bundle => {
            const plugin = this.generators.find(gen => {
                return gen.id === bundle.generator;
            }).plugin;
            plugin(bundle, doneBundles, this.cache);
        });
    }
}

module.exports = MendelGenerators;

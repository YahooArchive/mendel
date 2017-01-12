const DefaultGenerator = require('../bundles/default-generator');
const debug = require('debug')('mendel:generators');
const analyze = require('../helpers/analytics/analytics')('generator');

class MendelGenerators {
    constructor(options, registry) {
        this.registry = registry;
        this.options = options;

        this.generators = options.generators.map(generator => {
            return Object.assign({}, generator, {
                plugin: require(generator.plugin),
            });
        });

        // If bundle config doesn't contain "generator" property
        // Mendel-config puts "default" generator.
        this.generators.unshift({
            id: 'default',
            plugin: DefaultGenerator,
        });
    }

    perform(bundle, doneBundles) {
        const {id, plugin} = this.generators.find(gen => {
            return gen.id === bundle.options.generator;
        }) || {};
        if (!plugin) return;

        analyze.tic(id);
        const resultBundle = plugin(
            bundle, doneBundles,
            this.registry, this.options
        );
        analyze.toc(id);

        // TODO: real bundle validation, to be implemented in the Bundle
        // class, or alternativelly refactor bundle to POJO and use
        // validator right here instead.
        if (resultBundle && resultBundle.entries) {
            debug([
                `"${bundle.options.generator}" collected`,
                `${resultBundle.entries.size} entries for`,
                `bundle, "${bundle.options.id}"`,
            ].join(' '));
            doneBundles.push(resultBundle);
        }

        return doneBundles;
    }

    performAll(bundles) {
        bundles = bundles.slice().sort((a, b) => {
            return this.generators.findIndex(g => g.id === a.options.generator)
                - this.generators.findIndex(g => g.id === b.options.generator);
        });

        const doneBundles = [];
        bundles.forEach(bundle => {
            this.perform(bundle, doneBundles);
        });

        return doneBundles;
    }
}

module.exports = MendelGenerators;

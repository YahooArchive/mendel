
class MendelOutlets {
    constructor(options) {
        this.options = options;
        this.outlets = options.outlets;
    }

    perform(bundles) {
        bundles.forEach(bundle => {
            const outlet = this.outlets.find(outlet => {
                return outlet.id === bundle.options.outlet;
            });
            const Plugin = require(outlet.plugin);
            const plugin = new Plugin(this.options);

            plugin.perform(bundle);
        });
    }
}

module.exports = MendelOutlets;

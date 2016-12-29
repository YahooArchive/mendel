const mkdirp = require('mkdirp');
const path = require('path');

class MendelOutlets {
    constructor(options) {
        this.options = options;
        this.outlets = options.outlets;
    }

    perform(bundles) {
        const promises = bundles.map(bundle => {
            const outlet = this.outlets.find(outlet => {
                return outlet.id === bundle.options.outlet;
            });

            const Plugin = require(outlet.plugin);
            const plugin = new Plugin(this.options);

            mkdirp.sync(path.dirname(bundle.options.outfile));

            return Promise.resolve().then(() => plugin.perform(bundle));
        });
        return Promise.all(promises);
    }
}

module.exports = MendelOutlets;

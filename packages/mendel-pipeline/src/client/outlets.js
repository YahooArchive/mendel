const mkdirp = require('mkdirp');
const path = require('path');
const analyze = require('../helpers/analytics/analytics')('outlet');

class MendelOutlets {
    constructor(options) {
        this.options = options;
        this.outlets = options.outlets;
    }

    perform(bundles, variation=this.options.baseConfig.dir) {
        const promises = bundles.map(bundle => {
            const outlet = this.outlets.find(outlet => {
                return outlet.id === bundle.options.outlet;
            });

            const Plugin = require(outlet.plugin);
            const plugin = new Plugin(this.options);

            if (bundle.options.outfile) {
                mkdirp.sync(path.dirname(bundle.options.outfile));
            }

            return Promise.resolve()
            .then(analyze.tic.bind(analyze, outlet.id))
            .then(() => plugin.perform(bundle, variation))
            .then(analyze.toc.bind(analyze, outlet.id))
            .then(output => bundle.output = output);
        });
        return Promise.all(promises);
    }
}

module.exports = MendelOutlets;

const debug = require('debug')('mendel:outlet:css');
const fs = require('fs');
const cssnano = require('cssnano');
const postcss = require('postcss');

module.exports = class CSSOutlet {
    constructor(config, options) {
        this.config = config;
        this.outletOptions = options;
    }

    perform({entries, options}) {
        const source = Array.from(entries.values())
            .map(entry => entry.source).join('\n');
        const plugins = !this.outletOptions.plugin ? [] :
            this.outletOptions.plugin.map(p => {
                if (typeof p === 'string') return require(p);
                // Option to plugin support
                return require(p[0])(p[1]);
            });
        plugins.push(cssnano());

        return postcss(plugins)
        .process(source, {})
        .then(result => {
            debug(`Outputted: ${options.outfile}`);

            if (this.config.noout !== true && options.outfile) {
                fs.writeFileSync(options.outfile, result.css);
            } else {
                return result.css;
            }
        });
    }
};

const debug = require('debug')('mendel:outlet:css');
const fs = require('fs');
const postcss = require('postcss');
const Concat = require('concat-with-sourcemaps');

function combineCss(cssEntries, outputFileName='') {
    const concat = new Concat(true, outputFileName, '\n');

    Array.from(cssEntries.values())
    .forEach(entry => {
        concat.add(entry.id, entry.source, entry.map);
    });

    const map = JSON.parse(concat.sourceMap);
    map.sourcesContent = map.sources
        .map((id, index) => {
            if (map.sourcesContent[index]) return map.sourcesContent[index];
            if (!cssEntries.has(id)) return null;
            return cssEntries.get(id).source;
        });

    return {
        source: concat.content.toString('utf8'),
        map: JSON.stringify(map),
    };
}

module.exports = class CSSOutlet {
    constructor(config, options) {
        this.config = config;
        this.outletOptions = options;
    }

    perform({entries, options}) {
        const {source, map} = combineCss(entries, options.outfile);
        const plugins = !this.outletOptions.plugin ? [] :
            this.outletOptions.plugin.map(p => {
                if (typeof p === 'string') return require(p);
                // Option to plugin support
                return require(p[0])(p[1]);
            });

        const postCssOptions = Object.assign({
            // Sourcemap url will be generated using this property.
            // E.g., ./app.css.map
            to: options.outfile,
            map: {
                prev: map,
                inline: true,
            },
        }, this.outletOptions);
        delete postCssOptions.plugin;

        return postcss(plugins)
        .process(source, postCssOptions)
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

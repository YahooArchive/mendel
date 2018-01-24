const debug = require('debug')('mendel:outlet:css');
const fs = require('fs');
const postcss = require('postcss');
const Concat = require('concat-with-sourcemaps');
const postcssRemoveImportPlugin = require('./mendel-postcss-remove-import');

module.exports = class CSSOutlet {
    constructor(config, options) {
        this.config = config;
        this.outletOptions = options;
    }

    perform({entries, options}, variations) {
        const plugins = !this.outletOptions.plugin ? [] :
            this.outletOptions.plugin.map(p => {
                if (typeof p === 'string') return require(p);
                // Option to plugin support
                return require(p[0])(p[1]);
            });

        return this._preprocess(this._filterVariations(entries, variations))
        .then(procssedEntries => combineCss(procssedEntries, options.outfile))
        .then(({source, map}) => {
           const postCssOptions = Object.assign({
               // Sourcemap url will be generated using this property.
               // E.g., ./app.css.map
               to: options.outfile,
               map: {
                   prev: map,
                   inline: options.sourcemap === false,
               },
           }, this.outletOptions);
           delete postCssOptions.plugin;

           return this._transform(source, plugins, postCssOptions)
           .then(({css}) => {
               debug(`Outputted: ${options.outfile}`);

               if (this.config.noout !== true && options.outfile) {
                   fs.writeFileSync(options.outfile, css);
               } else {
                   return css;
               }
           });
        });
    }

    _filterVariations(entries, variations) {
        const normalizedEntries = Array.from(
            entries.values()
        ).reduce((normalized, entry) => {
            normalized[entry.normalizedId] =
                normalized[entry.normalizedId] || [];
            normalized[entry.normalizedId].push(entry);
            return normalized;
        }, {});

        const variationalEntries = Object.keys(
            normalizedEntries
        ).reduce((variational, key) => {
            const entries = normalizedEntries[key];
            const pick = entries.sort((a, b) => {
                return (
                    variations.indexOf(a.variation) -
                    variations.indexOf(b.variation)
                );
            })[0];
            variational.set(pick.id, pick);
            return variational;
        }, new Map());

        return variationalEntries;
    }

    _preprocess(entries) {
        const processedEntries = new Map();
        let promise = Promise.resolve();
        entries.forEach(entry => {
            const {deps, id, source, map} = entry;
            const set = new Set();

            Object.keys(deps)
            .filter(key => !deps[key]|| deps[key].browser !== '_noop')
            .forEach(key => set.add(key));

            if (set.size === 0) {
                promise = promise.then(() => {
                    return {css: entry.source};
                });
            } else {
                promise = promise.then(() => {
                    postcssRemoveImportPlugin.setToRemove(set);
                    return this._transform(source, [postcssRemoveImportPlugin]);
                });
            }

            promise = promise.then(({css}) => {
                processedEntries.set(id, {id, css, map});
            });
        });

        return promise.then(() => processedEntries);
    }

    _transform(source, plugins, options = {}) {
        return postcss(plugins)
        .process(source, options);
    }
};

function combineCss(cssEntries, outputFileName='') {
    const concat = new Concat(true, outputFileName, '\n');

    Array.from(cssEntries.values())
    .forEach(({id, css, map}) => concat.add(id, css, map || null));

    const map = JSON.parse(concat.sourceMap);
    map.sourcesContent = map.sources
        .map((id, index) => {
            if (map.sourcesContent && map.sourcesContent[index])
                return map.sourcesContent[index];
            if (!cssEntries.has(id))
                return null;
            return cssEntries.get(id).source;
        });

    return {
        source: concat.content.toString('utf8'),
        map: JSON.stringify(map),
    };
}

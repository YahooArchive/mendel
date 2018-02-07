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

    perform({entries, options: bundleConfig}, variations) {
        const outfile = bundleConfig.outfile;
        const writeFiles = this.config.noout !== true && outfile;
        const plugins = !this.outletOptions.plugin ? [] :
            this.outletOptions.plugin.map(p => {
                if (typeof p === 'string') return require(p);
                // Option to plugin support
                return require(p[0])(p[1]);
            });

        // TODO: Re-enable preprocess
        return Promise.resolve(this._filterVariations(entries, variations))
        .then(entriesToCombine => combineCss(entriesToCombine, outfile))
        .then(({source, map}) => {
           const postCssOptions = Object.assign({
               // Sourcemap url will be generated using this property.
               // E.g., ./app.css.map
               to: outfile,
               map: bundleConfig.sourcemap !== false && {
                   prev: map,
                   inline: !writeFiles,
               },
           }, this.outletOptions);
           delete postCssOptions.plugin;

           return this._transform(source, plugins, postCssOptions)
           .then(({css, map}) => {
               if (writeFiles) {
                   const mapfile = outfile + '.map';
                   const mapdata = JSON.stringify(map);
                   fs.writeFileSync(outfile, css);
                   fs.writeFileSync(mapfile, mapdata);

                   debug([
                      `Wrote: ${outfile}, ${css.length} bytes`,
                      `Wrote: ${mapfile}, ${mapdata.length} bytes`,
                   ].join('\n'));

               } else {
                   debug(`Returned css of ${css.length} bytes`);

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
            let pick;
            for (let i = 0; i < variations.length; i++) {
                pick = pick || entries.find(_ => _.variation === variations[i]);
            }
            variational.set(pick.id, pick);
            return variational;
        }, new Map());

        debug([
            `Found ${variationalEntries.size} matches`,
            `for ${variations}`,
            `out of ${entries.size} css entries`,
        ].join(' '));

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
    .sort((a, b) => a.order - b.order)
    .forEach(({id, source, map}) => {
        concat.add(id, source, map || null);
    });

    const map = JSON.parse(concat.sourceMap);
    map.sourcesContent = map.sources
        .map((id, index) => {
            if (map.sourcesContent && map.sourcesContent[index])
                return map.sourcesContent[index];
            if (!cssEntries.has(id))
                return null;
            return cssEntries.get(id).source;
        });

    const result = {
        source: concat.content.toString('utf8'),
        map: JSON.stringify(map),
    };
    debug([
        `Concatenated ${cssEntries.size} files`,
        `to buffer of ${result.source.length} bytes`,
        `and sourcemap of ${result.map.length} bytes`,
    ].join(' '));
    return result;
}

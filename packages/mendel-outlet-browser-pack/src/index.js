const debug = require('debug')('mendel:outlet:manifest');
const fs = require('fs');
const {Transform} = require('stream');
const {Buffer} = require('buffer');
const browserpack = require('browser-pack');

class PaddedStream extends Transform {
    constructor({prelude='', appendix=''}, options) {
        super(options);
        this.prelude = prelude;
        this.appendix = appendix;
        this.started = false;
    }
    // Called on every chunk
    _transform(chunk, encoding, cb) {
        if (!this.started) {
            this.started = true;
            chunk = Buffer.concat([Buffer.from(this.prelude), chunk]);
        }
        cb(null, chunk);
    }
    // Called right before it wants to end
    _flush(cb) {
        this.push(Buffer.from(this.appendix));
        cb();
    }
}

function matchVar(entries, multiVariations) {
    for (let i = 0; i < multiVariations.length; i++) {
        const varId = multiVariations[i];
        const found = entries.find(entry => {
            return entry.variation === varId && entry.runtime !== 'main';
        });
        if (found) return found;
    }
}

module.exports = class ManifestOutlet {
    constructor(options) {
        this.config = options;
    }

    perform({entries, options}, variations) {
        return new Promise((resolve, reject) => {
            // globals like, "process", handling
            const processEntries = Array.from(entries.values())
                .filter(({normalizedId}) => normalizedId === 'process');
            const hasProcess = processEntries.length > 0;
            const bundles = this.getPackJSON(entries);
            const pack = browserpack(
                Object.assign(
                    {},
                    options.browserPackOptions,
                    {
                        raw: true, // since we pass Object instead of JSON string
                        hasExports: true, // exposes require globally. Required for multi-bundles.
                    }
                )
            );

            let prelude = '';
            let appendix = '';

            if (hasProcess) {
                prelude = '(function(){var process={env: {}};';
                appendix = '})();';
            }

            if (!this.config.noout && options.outfile) {
                let source = '';
                // If `outfile` exists, output it to appropriate file
                pack.on('error', reject);
                pack.on('data', buf => source += buf.toString());
                pack.on('end', () => {
                    source += appendix;
                    fs.writeFileSync(options.outfile, source);
                    resolve();
                });
            } else {
                // Return a stream back if outfile is not declared.
                // You can pipe it or do whatever with it.
                const stream = new PaddedStream({appendix, prelude});
                pack.pipe(stream);
                setImmediate(() => resolve(stream));
            }

            const arrData = bundles
                .map(({data}) => matchVar(data, variations))
                // There can be bundle that does not pertain to certain variational chain (and no entry on base var)
                .filter(Boolean);
            this.writeToStream(pack, arrData);
        });
    }

    writeToStream(stream, arrData) {
        if (!arrData.length) stream.end();

        // Writing null terminates the stream. It is equal to EOF for streams.
        while (arrData.length && stream.write(arrData[0])) {
            // If successfully written, remove written one from the arrData.
            arrData.shift();
        }
        if (arrData.length) {
            stream.once(
                'drain',
                this.writeToStream.bind(this, stream, arrData)
            );
        } else {
            stream.end();
        }
    }

    dataFromItem(item) {
        const data = {
            id: item.normalizedId,
            // Clone the object so mutating it does not mutate source entry
            deps: Object.assign({}, item.deps),
            file: item.id,
            variation: item.variation || this.config.baseConfig.dir,
            source: item.source,
            entry: item.entry,
            expose: item.expose,
        };

        return data;
    }

    getPackJSON(entries) {
        const groupedByNorm = new Map();
        const depToData = new Map();

        entries.forEach(item => {
            const id = item.normalizedId;
            const data = this.dataFromItem(item);
            const entry = groupedByNorm.get(id) || {
                id: item.normalizedId,
                variations: [],
                data: [],
            };

            if (entry.variations.includes(data.variation)) {
                return debug([
                    `${entry.variations} vs.`,
                    `${item.id}|${item.variation}`,
                    'WARN: normalizedId and variation collision',
                ].join(' '));
            }

            entry.data.push(data);
            entry.variations.push(data.variation);

            entry.entry = entry.entry || !!item.expose;
            entry.expose = entry.expose || item.expose;
            groupedByNorm.set(id, entry);

            // this will be used when we shorten internal module's id
            // to index
            Object.keys(data.deps).forEach(literal => {
                const norm = data.deps[literal];
                if (!depToData.has(norm)) depToData.set(norm, []);
                depToData.get(norm).push({deps: data.deps, literal});
            });
        });

        return Array.from(groupedByNorm.values()).map((entry, index) => {
            const internal = !entry.entry && !entry.expose;
            if (!internal) return entry;

            const norm = entry.id;
            entry.data.forEach(d => d.id = index);
            if (depToData.has(norm)) {
                depToData.get(norm).forEach(({deps, literal}) => {
                    deps[literal] = index;
                });
            }
            return entry;
        });
    }
};

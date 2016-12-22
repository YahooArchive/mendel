const debug = require('debug')('mendel:outlet:manifest');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

module.exports = class ManifestOutlet {
    constructor(options) {
        this.config = options;
    }

    perform({entries, options}) {
        const manifest = this.getV1Manifest(entries);
        const outfileObject = path.parse(options.outfile);

        outfileObject.base = null;
        outfileObject.name = outfileObject.name.endsWith('.manifest') ?
            outfileObject.name :
            outfileObject.name + '.manifest';
        outfileObject.ext = '.json';

        const manifestFileName = path.format(outfileObject);
        mkdirp.sync(path.dirname(manifestFileName));
        fs.writeFileSync(
            manifestFileName,
            JSON.stringify(manifest, null, 2)
        );

        debug(`Outputted: ${manifestFileName}`);
    }

    dataFromItem(item) {
        const data = {
            id: item.normalizedId,
            deps: item.deps,
            file: item.id,
            variation: item.variation || this.config.baseConfig.dir,
            source: item.source,
        };

        if (item.expose) data.expose = item.expose;
        if (item.entry) data.entry = item.entry;
        return data;
    }

    getV1Manifest(entries) {
        const manifest = {
            indexes: {},
            bundles: [],
        };

        entries.forEach(item => {
            const id = item.normalizedId;

            if (!manifest.indexes[id]) {
                const data = this.dataFromItem(item);
                const newEntry = {
                    id: item.normalizedId,
                    index: null,
                    variations: [data.variation],
                    data: [data],
                };

                if (item.entry) newEntry.entry = item.entry;
                manifest.bundles.push(newEntry);
                const index = manifest.bundles.indexOf(newEntry);

                manifest.indexes[id] = index;
                newEntry.index = index;
            } else {
                const index = manifest.indexes[id];
                const existing = manifest.bundles[index];
                const newData = this.dataFromItem(item);

                if (existing.variations.includes(newData.variation)) {
                    return debug(
                        `${existing.file}|${existing.variations}  `,
                        `${item.id}|${item.variation}`,
                        'WARN: normalizedId and variation collision'
                    );
                }
                existing.variations.push(newData.variation);
                existing.data.push(newData);
            }
        });

        return manifest;
    }
};

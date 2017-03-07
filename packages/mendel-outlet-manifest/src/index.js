const debug = require('debug')('mendel:outlet:manifest');
const fs = require('fs');
const shasum = require('shasum');

// Manifest
module.exports = class ManifestOutlet {
    constructor(config, options, runtime='browser') {
        this.config = config;
        this.runtime = runtime;
    }

    perform({entries, options}) {
        const manifest = this.getV1Manifest(entries);
        const manifestFileName = options.manifest;
        fs.writeFileSync(
            manifestFileName,
            JSON.stringify(manifest, null, 2)
        );

        debug(`Outputted: ${manifestFileName}`);
    }

    dataFromItem(item) {
        const deps = {};
        Object.keys(item.deps).forEach(key => {
            const dep = item.deps[key][this.runtime];
            deps[key] = dep;
        });

        const data = {
            id: item.normalizedId,
            deps,
            file: item.id,
            variation: item.variation || this.config.baseConfig.dir,
            source: item.source,
            sha: shasum(item.source),
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

                if (data.entry) newEntry.entry = data.entry;
                if (data.expose) newEntry.expose = data.expose;
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

                if (newData.entry) existing.entry = newData.entry;
                if (newData.expose) existing.expose = newData.expose;
            }
        });

        return manifest;
    }
};

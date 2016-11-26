const mendelConfig = require('../../mendel-config');
const CacheClient = require('./cache/client');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('mendel:outlets');

class MendelOutlets {
    constructor(options) {
        this.config = mendelConfig(options);

        const cache = new Map();
        const client = new CacheClient(this.config, cache);

        client.on('sync', () => {

            const manifest = {
                indexes: {},
                bundles: [],
            };

            // TODO: check why "./components/toolbar.js" has "bucket_A" in
            // in mendel_v2
            cache.forEach(item => {
                const id = item.normalizedId;

                if (!manifest.indexes[id]) {
                    const data = this.dataFromItem(item);
                    const newEntry = {
                        variations: [data.variation],
                        file: item.id,
                        id: item.normalizedId,
                        data: [data],
                    };

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

            fs.writeFileSync(
                path.join(this.config.projectRoot, 'test.manifest.json'),
                JSON.stringify(manifest, null, 2)
            );

        });
    }

    dataFromItem(item) {
        return {
            id: item.normalizedId,
            deps: Object.keys(item.deps).reduce((newDeps, key) => {
                newDeps[key] = item.deps[key].browser;
                return newDeps;
            }, {}),
            variation: item.variation || this.config.baseConfig.dir,
            source: item.source,
        };
    }
}

module.exports = MendelOutlets;

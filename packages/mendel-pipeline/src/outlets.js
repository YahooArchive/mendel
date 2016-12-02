const mendelConfig = require('../../mendel-config');
const CacheClient = require('./cache/client');
const MendelGenerators = require('./generators');
const MendelOutletRegistry = require('./registry/outlet');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('mendel:outlets');
const mkdirp = require('mkdirp');

class MendelOutlets {
    constructor(options) {
        if (options.config === false) {
            this.config = options;
        } else {
            this.config = mendelConfig(options);
        }

        this.registry = new MendelOutletRegistry(this.config);
        this.generators = new MendelGenerators(this.config, this.registry);
        this.setupClient();
    }

    setupClient() {

        const client = new CacheClient(this.config, this.registry);

        client.on('error', (error) => {
            if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
                console.error('Please, use --outlet only when you have another'+
                    'mendel process running on --watch mode.');
                process.exit(1);
            }
        });

        client.on('sync', () => {

            this.generators.perform();

            const manifest = this.getV1Manifest(
                this.generators.doneBundles[0].entries);
            // TODO: mendel-config v2 not parsing output build path
            const dest = path.join(
                this.config.projectRoot, 'build/test.manifest.json'
            );
            mkdirp.sync(path.dirname(dest));
            fs.writeFileSync(
                dest,
                JSON.stringify(manifest, null, 2)
            );

            process.exit(0);

        });
    }

    dataFromItem(item) {
        return {
            id: item.normalizedId,
            deps: item.deps,
            file: item.id,
            variation: item.variation || this.config.baseConfig.dir,
            source: item.source,
        };
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
}

module.exports = MendelOutlets;

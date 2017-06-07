const debug = require('debug')('mendel:outlet:manifest');
const babelCore = require('babel-core');
const manifestUglify = require('mendel-manifest-uglify');
const fs = require('fs');
const shasum = require('shasum');
const sortManifest = require('mendel-development/sort-manifest');
const validateManifest = require('mendel-development/validate-manifest');

// Manifest
module.exports = class ManifestOutlet {
    constructor(config, options) {
        // Mendel config
        this.config = config;
        // outlet options
        this.options = Object.assign({
            envify: true,
            uglify: true,
            runtime: 'browser',
        }, options);
        this.runtime = this.options.runtime;
        this.name = 'mendel-outlet-manifest';
    }

    perform({entries, options}) {
        const manifestFileName = options.manifest;

        // We are going to mutate this guy; make sure we don't change the original one
        entries = new Map(entries.entries());
        if (this.options.envify) this.removeProcess(entries);
        let manifest = this.getV1Manifest(entries);

        if (this.options.envify) manifest = this.envify(manifest);
        if (this.options.uglify) manifest = this.uglify(manifest);
        manifest = sortManifest(manifest);

        validateManifest(manifest, manifestFileName, this.name);

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

    removeProcess(entries) {
        Array.from(entries.keys()).forEach(key => {
            const entry = entries.get(key);
            if (!entry) return;

            if (entry.normalizedId === 'process') entries.delete(key);
        });
    }

    envify(manifest) {
        manifest.bundles.map(row => {
            row.data.forEach(data => {
                if (!data.deps.process) return;

                const {code} = babelCore.transform(data.source, {
                    plugins: ['transform-inline-environment-variables'],
                });
                data.source = code;
                delete data.deps.process;
            });
        });

        return manifest;
    }

    uglify(manifest) {
        manifestUglify([manifest], {
            // `compress` and `mangle` are set to `true` on uglifyify
            // just making sure we have the same defaults
            uglifyOptions: {
                root: this.config.baseConfig.dir,
                compress: this.options.compress ? this.options.compress : true,
                mangle: this.options.mangle ? this.options.mangle : true
            },
        }, ([uglifiedManifest]) => {
            // happens immediately
            manifest = uglifiedManifest;
        });

        return manifest;
    }

    getV1Manifest(entries) {
        const manifest = {
            indexes: {},
            bundles: [],
        };

        Array.from(entries.keys()).sort()
        .forEach(key => {
            const item = entries.get(key);
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

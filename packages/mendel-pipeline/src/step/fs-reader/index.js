const BaseStep = require('../step');
const path = require('path');
const fs = require('fs');
const analytics = require('../../helpers/analytics/analytics')('fs');
const debugError = require('debug')('mendel:reader:error');

class FileReader extends BaseStep {
    constructor({registry, depsResolver}, {projectRoot, types}) {
        super();
        this.depsResolver = depsResolver;
        this.projectRoot = projectRoot;
        this.registry = registry;
        this._typeMap = new Map();
        types.forEach(type => this._typeMap.set(type.name, type));
        this.sourceExt = new Set();
    }

    perform(entry) {
        // raw can exist without read step in case of virtual files and others.
        if (entry.getRawSource()) {
            return this.emit('done', {entryId: entry.id});
        }

        const filePath = path.resolve(this.projectRoot, entry.id);
        const entryType = this.registry.getType(entry.id);
        const isBinary = !this._typeMap.has(entryType) || this._typeMap.get(entryType).isBinary;

        analytics.tic('read');
        fs.readFile(filePath, isBinary ? 'binary' : 'utf8', (error, source) => {
            analytics.toc('read');
            if (error) {
                debugError([
                    `[WARN] while reading ${filePath}.`,
                    'Normal for default node packages.',
                ].join(' '));
                return;
            }

            this.depsResolver.detect(entry.id, source).then(({deps}) => {
                this.registry.addSource({id: entry.id, source, deps});
                this.emit('done', {entryId: entry.id});
            });
        });
    }
}

module.exports = FileReader;

const BaseStep = require('../step');
const path = require('path');
const fs = require('fs');
const analytics = require('../../helpers/analytics/analytics')('fs');
const debugError = require('debug')('mendel:reader:error');

class FileReader extends BaseStep {
    constructor({registry}, {projectRoot, types}) {
        super();

        this.projectRoot = projectRoot;
        this.registry = registry;
        this._typeMap = new Map();
        types.forEach(type => this._typeMap.set(type.name, type));
        this.sourceExt = new Set();
    }

    perform(entry) {
        // raw can exist without read step in case of virtual files and others.
        if (entry.hasSource(['raw'])) {
            return this.emit('done', {entryId: entry.id});
        }

        const filePath = path.resolve(this.projectRoot, entry.id);
        const entryType = this.registry.getType(entry.id);
        const isBinary = !this._typeMap.has(entryType) || this._typeMap.get(entryType).isBinary;

        // TODO we need to skip for virtual files
        analytics.tic('read');
        fs.readFile(filePath, isBinary ? 'binary' : 'utf8', (error, source) => {
            analytics.toc('read');
            if (error) {
                debugError(`Errored while reading ${filePath}`);
                // TODO: uncomment line below, fix resolver
                // throw error;
            } else {
                this.registry.addRawSource(entry.id, source);
            }
            this.emit('done', {entryId: entry.id});
        });
    }
}

module.exports = FileReader;

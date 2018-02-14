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
        this._types = types;
        this.sourceExt = new Set();
    }

    perform(entry) {
        // raw can exist without read step in case of virtual files and others.
        if (entry.rawSource) return this.emit('done', {entryId: entry.id});
        const filePath = path.resolve(this.projectRoot, entry.id);
        const {type} = entry;
        const {isBinary} = (this._types.get(type) || {isBinary: true});

        analytics.tic('read');
        fs.readFile(filePath, isBinary ? 'binary' : 'utf8', (error, source) => {
            analytics.toc('read');
            if (error) {
                console.error([
                    `[Mendel] Critical error while reading "${filePath}".`,
                ].join(' '));
                debugError(`Error message for ${filePath}: ${error.stack}`);
                // We need to exit in such case..
                process.exit(1);
            }

            this.registry.addSource({id: entry.id, source, deps: {}});
            this.emit('done', {entryId: entry.id});
        });
    }
}

module.exports = FileReader;

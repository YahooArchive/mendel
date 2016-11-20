const BaseStep = require('../step');
const path = require('path');
const fs = require('fs');
const analytics = require('../../helpers/analytics/analytics')('fs');
const debugError = require('debug')('mendel:reader:error');

class FileReader extends BaseStep {
    constructor({registry}, {projectRoot}) {
        super();

        this.projectRoot = projectRoot;
        this.registry = registry;
        this.sourceExt = new Set();
    }

    perform(entry) {
        const filePath = path.resolve(this.projectRoot, entry.id);

        analytics.tic('read');
        fs.readFile(filePath, 'utf8', (error, source) => {
            analytics.toc('read');
            if (error) {
                debugError(`Errored while reading ${filePath}`);
                // TODO: uncomment line below, fix resolver
                // throw error;
            }

            this.registry.addRawSource(entry.id, source);
            this.emit('done', {entryId: entry.id});
        });
    }
}

module.exports = FileReader;

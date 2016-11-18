const BaseStep = require('../step');
const path = require('path');
const fs = require('fs');
const analytics = require('../../helpers/analytics/analytics')('fs');

class FileReader extends BaseStep {
    constructor({registry}, {types, projectRoot}) {
        super();

        this.projectRoot = projectRoot;
        this.registry = registry;
        this.sourceExt = new Set();
    }

    perform(entry) {
        const filePath = entry.id;

        analytics.tic('read');
        // FIX ME
        fs.readFile(path.resolve(this.projectRoot, filePath), 'utf8', (err, source) => {
            if (err) {
                // TODO handle the error
            }

            analytics.toc('read');
            this.registry.addRawSource(filePath, source);
            this.emit('done', {entryId: filePath});
        });
    }
}

module.exports = FileReader;

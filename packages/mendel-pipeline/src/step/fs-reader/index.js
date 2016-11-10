const BaseStep = require('../step');
const path = require('path');
const fs = require('fs');
const analytics = require('../../helpers/analytics/analytics')('fs');

class FileReader extends BaseStep {
    constructor({registry}, {types, cwd}) {
        super();

        this.cwd = cwd;
        this.registry = registry;
        this.sourceExt = new Set();
        Object.keys(types)
        .filter(typeName => !types[typeName].isBinary)
        .forEach(typeName => types[typeName].extensions.forEach(ext => this.sourceExt.add(ext)));
    }

    perform(entry) {
        const filePath = entry.id;
        const encoding = this.sourceExt.has(path.extname(filePath)) ? 'utf8' : 'binary';

        analytics.tic('read');
        fs.readFile(path.resolve(this.cwd, filePath), encoding, (err, source) => {
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

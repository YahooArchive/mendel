const EventEmitter = require('events').EventEmitter;
const path = require('path');
const fs = require('fs');

class FileReader extends EventEmitter {
    constructor({registry}, {types, cwd}) {
        super();

        this.cwd = cwd;
        this.registry = registry;
        this.sourceExt = new Set();
        Object.keys(types)
        .filter(typeName => !types[typeName].isBinary)
        .forEach(typeName => types[typeName].extensions.forEach(ext => this.sourceExt.add(ext)));

        registry.on('entryAdded', this.read.bind(this));
    }

    read(entry) {
        const filePath = entry.id;
        const encoding = this.sourceExt.has(path.extname(filePath)) ? 'utf8' : 'binary';

        fs.readFile(path.resolve(this.cwd, filePath), encoding, (err, source) => {
            if (err) {
                // TODO handle the error
            }

            this.registry.addRawSource(filePath, source);
        });
    }
}

module.exports = FileReader;

const debug = require('debug')('mendel:outlet:css');
const fs = require('fs');
const cssnano = require('cssnano');

module.exports = class CSSOutlet {
    constructor(options) {
        this.config = options;
    }

    perform({entries, options}) {
        const source = Array.from(entries.values())
            .map(entry => entry.source).join('\n');

        return cssnano.process(source, {})
        .then(result => {
            fs.writeFileSync(options.outfile, result);
            debug(`Outputted: ${options.outfile}`);
        });
    }
};

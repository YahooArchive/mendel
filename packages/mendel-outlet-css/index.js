const debug = require('debug')('mendel:outlet:css');
const fs = require('fs');

module.exports = class CSSOutlet {
    constructor(options) {
        this.config = options;
    }

    perform({entries, options}) {
        const source = Array.from(entries.values())
            .map(entry => entry.source).join('\n');

        fs.writeFileSync(options.outfile, source);
        debug(`Outputted: ${options.outfile}`);
    }
};

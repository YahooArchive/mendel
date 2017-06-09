const EXPOSE_GLOBAL = new Map([
    ['global', 'var global=window;'],
    ['process', 'var process=window.process||{env: {}};'],
]);

const {Transform} = require('stream');
const {Buffer} = require('buffer');
const browserpack = require('browser-pack');
const indexedDeps = require('./index-deps');

class PaddedStream extends Transform {
    constructor({prelude='', appendix=''}, options) {
        super(options);
        this.prelude = prelude;
        this.appendix = appendix;
        this.started = false;
    }
    // Called on every chunk
    _transform(chunk, encoding, cb) {
        if (!this.started) {
            this.started = true;
            chunk = Buffer.concat([Buffer.from(this.prelude), chunk]);
        }
        cb(null, chunk);
    }
    // Called right before it wants to end
    _flush(cb) {
        this.push(Buffer.from(this.appendix));
        cb();
    }
}

function writeToStream(stream, arrData) {
    if (!arrData.length) {
        stream.end();
        return;
    }

    // Writing null terminates the stream. It is equal to EOF for streams.
    while (arrData.length && stream.write(arrData[0])) {
        // If successfully written, remove written one from the arrData.
        arrData.shift();
    }
    if (arrData.length) {
        stream.once(
            'drain',
            () => writeToStream(stream, arrData)
        );
    } else {
        stream.end();
    }
}

function entriesHaveGlobalDep(arrEntries, globalName) {
    return arrEntries.some(({deps, normalizedId}) => {
        return normalizedId === globalName ||
            Object.keys(deps)
            .map(key => deps[key])
            .some(dep => dep === globalName);
    });
}

/**
 * In case global dependency got mixed into the bundleEntries,
 * remove those so we can have smaller payload.
 */
function removeGlobalDep(bundleEntries) {
    return bundleEntries.filter(({normalizedId}) => {
        return !EXPOSE_GLOBAL.has(normalizedId);
    });
}

module.exports = function mendelBrowserPack(bundleEntries, browserPackOptions) {
    const pack = browserpack(
        Object.assign(
            {},
            browserPackOptions,
            {
                raw: true, // since we pass Object instead of JSON string
                hasExports: true, // exposes `require` globally. Required for multi-bundles.
            }
        )
    );

    const globalDepKeys = Array.from(EXPOSE_GLOBAL).map(([key]) => {
        return entriesHaveGlobalDep(bundleEntries, key) && key;
    });
    const hasGlobalDep = globalDepKeys.some(h => h);
    if (hasGlobalDep) bundleEntries = removeGlobalDep(bundleEntries);

    bundleEntries = indexedDeps(bundleEntries);

    let prelude = '';
    let appendix = '';

    if (hasGlobalDep) {
        prelude = '(function(){';
        appendix = '})();';
    }

    globalDepKeys.filter(Boolean).forEach(key => {
        prelude += EXPOSE_GLOBAL.get(key);
    });

    const stream = new PaddedStream({appendix, prelude});
    pack.pipe(stream);

    writeToStream(pack, bundleEntries);

    return stream;
};

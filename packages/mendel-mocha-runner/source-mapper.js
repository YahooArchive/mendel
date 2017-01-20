const {SourceMapConsumer} = require('source-map');
const regex = /(at \S* |\S*@)[\(]{0,1}(\S+)\:(\d+)\:(\d+)[\)]{0,1}$/;

function parseStackTrace(rawStackTrace) {
    return rawStackTrace.split('\n').map(stackLine => {
        const match = stackLine.match(regex);
        if (!match || match.length !== 5) return stackLine;
        let description = match[1];
        if (description.indexOf('at ') === 0) {
            // This is the Chrome's "At desc " case
            description = description.slice(3).trim();
        } else {
            // This is the Firefox's "desc@" case
            description = description.slice(0, description.length - 1).trim();
        }

        return {
            raw: stackLine,
            description,
            file: match[2],
            line: parseInt(match[3], 10),
            column: parseInt(match[4], 10),
        };
    });
}

function mapper(rawSourceMap, line, column) {
    // From https://github.com/mozilla/source-map/
    const smc = new SourceMapConsumer(rawSourceMap);
    return smc.originalPositionFor({
        line,
        column,
    });
}

module.exports = function stackTraceMapper(stackTrace, registry) {
    const parsed = parseStackTrace(stackTrace);
    return parsed.map(stackLine => {
        // In case it is not a line with source number
        if (typeof stackLine !== 'object') return stackLine;

        const entry = registry.getEntry(stackLine.file);
        // In case of no map (files without transform) or v8 native code
        if (!entry || !entry.map) return stackLine.raw;
        const mapped = mapper(entry.map, stackLine.line, stackLine.column);
        const {source, line, column, name} = mapped;

        // Output stacktrace in v8 style
        return `    at ${name || stackLine.description} (${source}:${line}:${column})`; // eslint-disable-line max-len
    }).join('\n');
};

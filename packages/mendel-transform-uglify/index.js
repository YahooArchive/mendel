const uglify = require('uglify-es');

module.exports = function({ source, filename, map: inputSourceMap }, options) {
    const mergedOptions = Object.assign({}, options, {
        sourceMap: {
            content: inputSourceMap,
        },
    });

    const {code, map} = uglify.minify({[filename]: source}, mergedOptions);

    return { source: code, map };
};

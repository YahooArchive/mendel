const babel = require('babel-core');
const path = require('path');

function optionDepPath(arr, optionName) {
    return (arr || []).map(el => {
        const name = typeof el === 'string' ? el : el[0];
        let absPath = '';

        try {
            absPath = require.resolve(path.join(process.cwd(), name));
        } catch (e) {
            const pkgDir = path.join(
                process.cwd(),
                'node_modules',
                `babel-${optionName.toLowerCase()}-${name}`
            );
            absPath = require.resolve(pkgDir);
        }

        if (typeof el === 'string') return absPath;
        el[0] = absPath;
        return el;
    });
}

module.exports = function({source, filename, map: inputSourceMap}, options) {
    options.presets = optionDepPath(options.presets, 'preset');
    options.plugins = optionDepPath(options.plugins, 'plugin');

    const {code, map} = babel.transform(source,
        Object.assign({
            babelrc: false, // babelrc is ignored and needs to be configured only with the option
            sourceMaps: true, // We don't need inline as we store them separately
            ast: false,
            inputSourceMap, // sourcemap from previous transforms
            filename,
            sourceFileName: filename, // sourcemap contains filename this way
        }, options));

    return {source: code, map};
};

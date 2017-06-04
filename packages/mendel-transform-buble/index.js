const {transform} = require('buble');
const {EOL} = require('os');

module.exports = function({source, filename, map: inputSourceMap}, options) {
    options = options || {};
    const defaults = {source: filename};
    const transformOptions = Object.assign(defaults, options);

    transformOptions.transforms = Object.assign(
        {modules: false},
        options.transforms
    );
    transformOptions.target = Object.assign({}, options.target);

    const result = transform(source, transformOptions);
    let {code, map} = result;

    if (options.sourceMap) {
        // append sourcemaps to code
        code += `${EOL}//# sourceMappingURL=${map.toUrl()}`;
    }
    return {source: code, map};
};

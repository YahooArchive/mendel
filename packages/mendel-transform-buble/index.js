const path = require('path');
const {transform} = require('buble');

module.exports = function({source, filename}, options) {
    options = options || {};
    const defaults = {
        source: filename,
        file: path.basename(filename),
    };
    const transformOptions = Object.assign(defaults, options);

    transformOptions.transforms = Object.assign(
        {modules: false},
        options.transforms
    );
    transformOptions.target = Object.assign({}, options.target);

    const {code, map} = transform(source, transformOptions);

    return {source: code, map};
};

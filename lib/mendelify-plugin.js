var mendelify = require('./mendelify-transform-stream');

function mendelifyPlugin(b, opts) {
    if (!opts.variations) {
        throw new Error('invalid variations');
    }

    function addHooks() {
        b.pipeline.get('deps').push(mendelify(opts.variations));
    }

    b.on('reset', addHooks);
    addHooks();
}

module.exports = mendelifyPlugin;

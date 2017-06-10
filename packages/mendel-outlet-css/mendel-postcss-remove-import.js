/**
 * Because mendel-outlet-css concatenate CSS files into one,
 * all the @import that created dependency between CSS files are no
 * longer needed or valid. We need to remove them.
 */
const postcss = require('postcss');

let currentRemoval = new Set();

module.exports = postcss.plugin('postcss-remove-import', (/* options */) => {
    // Work with options here
    return root => {
        // Transform each rule here
        root.walkAtRules('import', atRule => {
            const path = atRule.params.replace(/(^["']|["']$)/g, '');

            if (currentRemoval.has(path)) {
                atRule.remove();
            }
        });
    };
});

module.exports.setToRemove = function(removalSet) {
    currentRemoval = removalSet;
};

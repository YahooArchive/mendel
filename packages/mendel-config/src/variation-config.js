const parseVariations = require('../variations');
const createValidator = require('./validator');
const validate = createValidator({
    variations: {type: 'array', minLen: 1},
    // There can be a user of Mendel who does not want variation but faster build.
    allVariationDirs: {type: 'array', minLen: 0},
    allDirs: {type: 'array', minLen: 1},
});

function VariationConfig(config) {
    const variations = parseVariations(config);
    const allVariationDirs = getAllDirs(variations);

    variations.push({
        id: config.baseConfig.id,
        chain: [config.baseConfig.dir],
    });

    const allDirs = getAllDirs(variations);
    const variationConfig = {variations, allDirs, allVariationDirs};

    validate(variationConfig);

    return variationConfig;
}

function getAllDirs(variationArray) {
    return variationArray.reduce((allDirs, variation) => {
        variation.chain.forEach(dir => {
            if (!allDirs.includes(dir)) allDirs.push(dir);
        });
        return allDirs;
    }, []);
}

module.exports = VariationConfig;

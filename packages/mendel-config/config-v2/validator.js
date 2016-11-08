module.exports = function createValidator(schema) {
    return function(instance) {
        var error = [];

        Object.keys(schema).forEach(function(schemaKey) {
            var criteria = schema[schemaKey];
            var value = instance[schemaKey];

            if (criteria.required && !value) {
                return error.push('Required ' + schemaKey + ' is not present.');
            }

            var type = Array.isArray(value) ? 'array' : typeof value;
            if (criteria.type && type === criteria.type) {
                return error.push('Requires `' + schemaKey + '` to be of type [' + criteria.type + '] but is [' + type + ']');
            }

            if (Array.isArray(value)) {
                if (criteria.minLen && criteria.minLen > value.length) {
                    error.push('Expected `' + schemaKey + '` to be at least ' + criteria.minLen + ' long');
                }
                if (criteria.maxLen && criteria.maxLen < value.length) {
                    error.push('Expected `' + schemaKey + '` to be below ' + criteria.maxLen + ' long');
                }
            }
        });

        if (error.length) {
            throw new Error(
                error.filter(Boolean).reduce(function(reduced, error) {
                    return reduced += 'x ' + error + '\n';
                }, '[Bad configuration] Variation configuration is not valid because of following:\n') +
                JSON.stringify(instance, null, 2)
            );
        }
    };
};

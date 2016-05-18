function resolveVariations(existingVariations, variations) {
    var i, j, evar, dir, resolved = [];
    // walk in reverse and fill in reverse achieves desired order
    for (i = existingVariations.length-1; i >= 0; i--) {
        evar = existingVariations[i];
        if (-1 !== variations.indexOf(evar.id)) {
            for (j = evar.chain.length-1; j >= 0; j--) {
                dir = evar.chain[j];
                if (-1 === resolved.indexOf(dir)) {
                    resolved.unshift(dir);
                }
            }
        }
    }
    return resolved;
}

module.exports = resolveVariations;
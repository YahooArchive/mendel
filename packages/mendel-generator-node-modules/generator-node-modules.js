function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = function generatorNodeModule(bundle, doneBundles) {
    const nodeModules = new Map();
    bundle.entries = nodeModules;

    doneBundles.forEach(doneBundle => {
        const {entries} = doneBundle;

        Array.from(entries.values())
            .filter(({id}) => isNodeModule(id))
            .forEach(entry => {
                // Remove it from main bundle
                entries.delete(entry.id);
                // and add it to the node module bundle;
                nodeModules.set(entry.id, entry);
                // TODO entry or expose are browserify concepts. Want to keep that?
                entry.expose = true;
            });
    });

    return bundle;
};

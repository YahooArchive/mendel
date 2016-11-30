class EntryProxy {
    static getFromEntry(entry, transformIds) {
        const proxy = new EntryProxy();
        proxy.filename = entry.id;
        proxy.normalizedId = entry.normalizedId;
        proxy.map; // TODO
        proxy.source = entry.getSource(transformIds);
        proxy.deps = entry.getDependency(transformIds);
        return proxy;
    }
 }

module.exports = EntryProxy;

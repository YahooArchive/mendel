class EntryProxy {
    static getFromEntry(entry, transformIds) {
        const proxy = new EntryProxy();
        proxy.id = entry.id;
        proxy.normalizedId = entry.normalizedId;
        proxy.source = entry.getSource(transformIds);
        proxy.deps = entry.getDependency(transformIds);
        return proxy;
    }
 }

module.exports = EntryProxy;

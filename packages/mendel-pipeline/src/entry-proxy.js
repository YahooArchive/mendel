class EntryProxy {
    static getFromEntry(entry) {
        const proxy = new EntryProxy();
        proxy.filename = entry.id;
        proxy.normalizedId = entry.normalizedId;
        proxy.map = entry.istMap;
        proxy.source = entry.istSource;
        proxy.deps = entry.istDeps;
        return proxy;
    }
 }

module.exports = EntryProxy;

class EntryProxy {
    static getFromEntry(entry) {
        const proxy = new EntryProxy();
        proxy.filename = entry.id;
        proxy.normalizedId = entry.normalizedId;
        proxy.map; // TODO
        proxy.source = entry.getSource();
        proxy.deps = entry.getDependency();
        return proxy;
    }
 }

module.exports = EntryProxy;

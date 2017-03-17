# mendel-generator-node-modules

Mendel-generator that creates special bundle with only node_modules from a bundle.
In a large application that changes rapidly, it is preferable to bifurcate a bundle into multiple bundles. When employing the strategy, it is preferable to put all node_modules into one bundle so the bundle caches better (unless you upgrade dependencies often).

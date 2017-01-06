const BaseClient = require('./base-client');

class BuildAll extends BaseClient {
    onSync() {
        Promise.resolve()
        .then(() => this.generators.performAll())
        .then(bundles => this.outlets.perform(bundles))
        .then(() => this.emit('done'))
        .catch(e => this.emit('error', e));
    }
}

module.exports = BuildAll;

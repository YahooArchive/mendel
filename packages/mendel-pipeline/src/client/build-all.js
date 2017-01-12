const BaseClient = require('./base-client');
const Bundle = require('../bundles/bundle');

class BuildAll extends BaseClient {
    onSync() {
        const bundles = this.config.bundles.map(opts => new Bundle(opts));
        Promise.resolve()
        .then(() => this.generators.performAll(bundles))
        .then(bundles => this.outlets.perform(bundles))
        .then(() => this.emit('done'))
        .catch(e => this.emit('error', e));
    }
}

module.exports = BuildAll;

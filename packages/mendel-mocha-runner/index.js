const Mocha = require('mocha');
const MendelClient = require('mendel-pipeline/client');
const exec = require('mendel-exec');
const path = require('path');

process.env.MENDELRC = '.mendelrc_v2';

const DEFAULT_OPTIONS = {
    watch: false,
};

const client = new MendelClient({
    environment: 'test',
    noout: true,
}).run();

function MendelRunner(filePaths, options) {
    options = Object.assign({}, DEFAULT_OPTIONS, options);
    const mocha = new Mocha(options);
    const sandbox = {};

    if (options.prelude) {
        require(path.resolve(process.cwd(), options.prelude));
    }

    client.once('ready', function() {
        const entries = client.registry.getEntriesByGlob(filePaths);

        entries.forEach(entry => {
            mocha.suite.emit('pre-require', sandbox, entry.id, mocha);

            const variationConf = client.config.variationConfig.variations
                .find(({dir}) => dir === entry.variation);
            const module = exec(
                client.registry, entry.normalizedId,
                [variationConf], sandbox
            );
            mocha.suite.emit('require', module, entry.id, mocha);
        });

        const runner = mocha.run();
        runner.on('end', function() {
            process.exit();
        });
    });
}

module.exports = MendelRunner;

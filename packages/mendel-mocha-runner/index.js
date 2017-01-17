const Mocha = require('mocha');
const MendelClient = require('mendel-pipeline/client');
const exec = require('mendel-exec');

process.env.MENDELRC = '.mendelrc_v2';

const DEFAULT_OPTIONS = {
    watch: false,
};

const client = new MendelClient({
    environment: 'test',
    noout: true,
}).run();

function MendelRunner(filePaths, options={}) {
    const watch = options.watch || false;
    // Watch is a feature of mendel, not mocha.
    options = Object.assign({}, DEFAULT_OPTIONS, options, {watch: false});

    client.on('ready', function() {
        const sandbox = {};
        const mocha = new Mocha(options);
        const entries = client.registry.getEntriesByGlob(filePaths);

        entries.forEach(entry => {
            mocha.suite.emit('pre-require', sandbox, entry.id, mocha);

            const variationConf = client.config.variationConfig.variations
                .find(({chain}) => chain[0] === entry.variation);
            const module = exec(
                client.registry, entry.normalizedId,
                [variationConf], sandbox
            );
            mocha.suite.emit('require', module, entry.id, mocha);
        });

        const runner = mocha.run();

        if (!watch) {
            runner.on('end', () => process.exit(runner.failures));
        }
    });

    client.on('change', function() {
        console.log('Mendel detected file change. Waiting for bundle...');
    });
}

module.exports = MendelRunner;

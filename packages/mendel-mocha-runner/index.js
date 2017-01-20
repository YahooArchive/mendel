const Mocha = require('mocha');
const MendelClient = require('mendel-pipeline/client');
const {execWithRegistry, exec} = require('mendel-exec');
const fs = require('fs');
const glob = require('glob');
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

    if (options.prelude) {
        options.prelude = glob.sync(options.prelude);
    }

    client.on('ready', function() {
        // Populate the global sandbox
        const sandbox = {};
        // Expose to mocha options for others.
        options.context = sandbox;

        // Istanbul support: it writes to global so make instrumentation
        // running in different context share object with the global one.
        sandbox.__coverage__ = global.__coverage__ = {};

        const mocha = new Mocha(options);
        const entries = client.registry.getEntriesByGlob(filePaths);

        entries.forEach(entry => {
            mocha.suite.emit('pre-require', sandbox, entry.id, mocha);

            options.prelude.forEach(file => {
                const entry = client.registry.getEntry('./' + file);
                const id = entry ? entry.id : file;
                const source = entry ? entry.source : fs.readFileSync(file, 'utf8');

                exec(id, source, {
                    sandbox,
                    resolver(from, dep) {
                        const fromEntry = client.registry.getEntry(from);
                        if (!fromEntry) return null;
                        const depNorm = fromEntry.deps[dep];
                        if (!depNorm || depNorm.indexOf('/') < 0 || depNorm.indexOf('node_modules') > 0) return null;
                        const entries = client.registry.getEntriesByNormId(depNorm);
                        if (!entries) return null;
                        return entries.values().next().value;
                    },
                });
            });

            const variationConf = client.config.variationConfig.variations
                .find(({chain}) => chain[0] === entry.variation);
            const module = execWithRegistry(
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

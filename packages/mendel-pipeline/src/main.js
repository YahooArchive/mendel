const chalk = require('chalk');
const MendelPipelineDaemon = require('./daemon');
const MendelClient = require('./client/build-all');

class Mendel {
    static get Daemon() {
        return MendelPipelineDaemon;
    }

    static get Client() {
        return MendelClient;
    }

    constructor(config) {
        this.daemon = new Mendel.Daemon(config);
        this.client = new Mendel.Client(Object.assign({
            verbose: false,
        }, config));
    }

    run(callback) {
        this.daemon.run(error => {
            if (error) {
                if (error instanceof ReferenceError) {
                    console.log(chalk.yellow([
                        'Instance of Mendel daemon may be running.',
                        'Attemping to recycle...',
                    ].join('\n')));
                } else {
                    console.error('Unknown daemon execution error: ', error);
                    process.exit(1);
                }
            }
            this.client.run(error => {
                if (error) return callback(error);
                setImmediate(() => callback());
            });
        });
    }

    onForceExit() {
        this.daemon.onForceExit();
    }
}

module.exports = Mendel;

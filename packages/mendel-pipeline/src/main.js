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
        this.client = new Mendel.Client(config);
    }

    run(callback) {
        this.daemon.run(error => {
            if (error) return callback(error);
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

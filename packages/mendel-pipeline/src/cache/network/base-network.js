class BaseNetwork {
    static getServer(/* connectionOptions */) {
        throw new Error('Implement this');
    }

    static getClient(/* connectionOptions */) {
        throw new Error('Implement this');
    }
}

module.exports = BaseNetwork;

const debug = require('debug');
const EventEmitter = require('events').EventEmitter;

class Step extends EventEmitter {
    constructor() {
        super();
    }

    static get name() {
        throw new Error('Must implement static "name"');
    }

    perform() {
        throw new Error('Must implement "perform"');
    }

    get verbose() {
        if (this._verbose) return this._verbose;
        return this._verbose = debug(
            `verbose:mendel:filestep:${this.constructor.name}`
        );
    }

    emit(eventName, {entryId = ''} = {}) {
        this.verbose(eventName, entryId);

        super.emit.apply(this, arguments);
    }
}

module.exports = Step;

/* eslint-env mocha */
/**
 * In a large project, one may want to inject utility functions in mocha
 * context. This file shows an example of that.
 */
beforeEach(function() {
    this.sayMeow = () => 'meow';
    this.sayWoof = () => 'woof';
});

afterEach(function() {
    if (this.sayMeow() !== 'meow') {
        throw new Error('Not meow?!');
    }
});

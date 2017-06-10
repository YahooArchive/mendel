const hi = require('./foo');
function foo() {
    global.console.log(process.env.NODE_ENV);
}

function bar() {}
console.log(bar);

var baz = 'baz';
console.log(baz.toString());

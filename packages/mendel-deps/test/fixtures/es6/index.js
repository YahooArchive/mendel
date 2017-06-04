import {hi} from './foo';

function foo() {
    global.console.log(process.env.NODE_ENV);
}

console.log(hi);

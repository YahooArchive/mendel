var bp = require('browser-pack');
const pack = bp({raw: true});
pack.write(
  {
    "id": "a1b5af78",
    "source": "console.log(require('./foo')(5))",
    "deps": { "./foo": "b8f69fa5" },
    "entry": true
  }
);
pack.write(
  {
    "id": "b8f69fa5",
    "source": "module.exports = function (n) { return n * 111 }",
    "deps": {}
  }
);
pack.end();
pack.on('data', (buf) => console.log(buf.toString()));

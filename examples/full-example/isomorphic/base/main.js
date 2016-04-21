import React from 'react'; // eslint-disable-line
import ReactDOM from 'react-dom';
import App from './components/app';

if (typeof document !== 'undefined') {
  var body = document.querySelector('body');
  ReactDOM.render(<App data={window.data} />, body);
} else {
    module.exports = function(data) {
        return <App data={data} />;
    }
}

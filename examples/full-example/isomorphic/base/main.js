/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */
import superagent from 'superagent';
import App from './components/app';
import React from 'react'; // eslint-disable-line
import ReactDOM from 'react-dom';

if (typeof document !== 'undefined') {
    var main = document.querySelector('#main');
    ReactDOM.render(<App data={window.data} />, main);
} else {
    module.exports = function(data) {
        return <App data={data} />;
    }
}

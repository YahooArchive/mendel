/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   Contributed by Shalom Volchok <shalom@digitaloptgroup.com>
   See the accompanying LICENSE file for terms. */

import React from 'react'; // eslint-disable-line
import ReactDOM from 'react-dom';
import App from './components/app';

if (typeof document !== 'undefined') {
    var main = document.querySelector('#main');
    ReactDOM.render(<App data={window.data} />, main);
} else {
    module.exports = function(data) {
        return <App data={data} />;
    }
}

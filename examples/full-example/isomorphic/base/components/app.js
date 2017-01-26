/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';
import Header from './header';
import Body from './body';
import Footer from './footer';
import superagent from 'superagent';

class App extends React.Component {
  render() {
    return (
        <div className="app">
            <Header />
            <Body />
            <Footer />
        </div>
    );
  }
}

export default App;

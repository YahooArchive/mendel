import React from 'react';
import Header from './header';
import Body from './body';
import Footer from './footer';


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

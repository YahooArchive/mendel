import React from 'react'; // eslint-disable-line
import ReactDOM from 'react-dom';
import App from './components/app';

if (typeof document !== 'undefined') {
  var body = document.querySelector('body');
  ReactDOM.render(<App/>, body);
} else {
  var ReactDOMServer = require('react-dom/server');
  var markup = ReactDOMServer.renderToStaticMarkup(<App/>);
  console.log(markup);
}

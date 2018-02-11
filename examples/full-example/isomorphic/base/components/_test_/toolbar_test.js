/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react'; // eslint-disable-line no-unused-vars
import {findDOMNode} from 'react-dom'; // eslint-disable-line no-unused-vars
import {
  renderIntoDocument,
  scryRenderedDOMComponentsWithTag,
} from 'react-dom/test-utils';
import Toolbar from '../toolbar';
import {expect} from 'chai';

describe('toolbar [base]', function() {
  it('contains a button with correct label', function() {
    const toolbar = renderIntoDocument(<Toolbar />);
    const buttons = scryRenderedDOMComponentsWithTag(toolbar, 'button');

    expect(findDOMNode(buttons[0]).innerText).to.equal('Button');
  });
});

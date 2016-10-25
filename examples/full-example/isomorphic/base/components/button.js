/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';

class Button extends React.Component {
    render() {
        return <button {...this.props}>
            {this.props.children}
        </button>;
    }
}

export default Button;

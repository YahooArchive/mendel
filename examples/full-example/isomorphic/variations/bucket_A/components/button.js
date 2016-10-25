/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';

var count = 0;

class Button extends React.Component {
    render() {
        return (
            <button {...this.props}>
                {this.props.children} A#{++count}
            </button>
        );
    }
}

export default Button;

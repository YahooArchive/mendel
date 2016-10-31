/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';
import Button from './button';

class Toolbar extends React.Component {
    render() {
        return (
            <div>
                <div>Toolbar</div>
                <nav className="toolbar">
                    <Button onClick={this.handleClick}>Button</Button>
                    <Button>Button</Button>
                    <Button>Button</Button>
                </nav>
            </div>
        );
    }
}

export default Toolbar;

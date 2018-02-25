/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';
import Button from './button';

class Toolbar extends React.Component {
    render() {
        return (
            <div>
                <p>Toolbar B</p>
                <nav className="toolbar feature_B">
                    <Button>B</Button>
                    <span className="spacer" />
                    <Button>B</Button>
                    <span className="spacer" />
                    <Button>B</Button>
                </nav>
            </div>
        );
    }
}

export default Toolbar;

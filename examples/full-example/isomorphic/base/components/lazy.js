/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';
import Button from './button';
import LazyContent from './lazy_content';

class Lazy extends React.Component {
    render() {
        return (
            <div>
                <LazyContent />
                <Button>Lazy Button</Button>
            </div>
        );
    }
}

export default Lazy;

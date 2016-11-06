/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';
import ExtraLazyFile from './extra_lazy';

class Button extends React.Component {
    render() {
        return <div style={{ color: 'red' }}>
            <div>Content inside lazy bucket_A</div>
            <ExtraLazyFile />
        </div>;
    }
}

export default Button;

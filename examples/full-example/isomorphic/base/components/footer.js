/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';

function foo() {
    const env = process.env.NODE_ENV || 'development';
    console.log(env);
    return env;
}

class Footer extends React.Component {
    render() {
        return (
            <footer>
                <div>--- footer stuff ---</div>
                <div>Current NODE_ENV is {foo()}</div>
            </footer>
        );
    }
}

export default Footer;

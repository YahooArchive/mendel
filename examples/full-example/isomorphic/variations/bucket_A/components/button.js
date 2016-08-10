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

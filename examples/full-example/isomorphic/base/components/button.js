import React from 'react';

class Button extends React.Component {
    render() {
        return <button {...this.props}>
            {this.props.children}
        </button>;
    }
}

export default Button;

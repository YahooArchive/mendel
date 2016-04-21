import React from 'react';
import Button from './button';

class Toolbar extends React.Component {
    render() {
        return (
            <nav className="toolbar feature_B">
                <Button />
                <span className="spacer" />
                <Button />
                <span className="spacer" />
                <Button />
            </nav>
        );
    }
}

export default Toolbar;

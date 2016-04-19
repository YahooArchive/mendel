import React from 'react';
import Button from './button';

class Toolbar extends React.Component {
    render() {
        return (
            <nav className="toolbar">
                <Button />
                <Button />
                <Button />
            </nav>
        );
    }
}

export default Toolbar;

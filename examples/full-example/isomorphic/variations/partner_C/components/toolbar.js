import React from 'react';
import Button from './button';
import DropDown from './dropdown';

class Toolbar extends React.Component {
    render() {
        return (
            <nav className="toolbar partner_C">
                <DropDown />
                <span className="spacer" />
                <Button />
                <Button />
                <Button />
            </nav>
        );
    }
}

export default Toolbar;

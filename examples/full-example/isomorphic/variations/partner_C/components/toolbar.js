import React from 'react';
import Button from './button';
import DropDown from './dropdown';

class Toolbar extends React.Component {
    render() {
        return (
            <div>
                <div>partner_C toolbar</div>
                <nav className="toolbar partner_C">
                    <DropDown />
                    <span className="spacer" />
                    <Button onClick={this.handleClick} />
                    <Button />
                    <Button />
                </nav>
            </div>
        );
    }
}

export default Toolbar;

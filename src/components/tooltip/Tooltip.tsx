import React from 'react';
import './tooltip.css';

interface ToolTipProps {
    label: string;
    align?: 'left' | 'right' | 'bottom-right' | 'bottom-left'
    children: JSX.Element;
}
const Tooltip = (props: ToolTipProps) => {
    const { children, align, label } = props;
    return (
        <div className='tooltip-container'>
            {children}
            <div className={`tooltip tooltip-${align}`}>{label}</div>
        </div>
    )
}

export default Tooltip

Tooltip.defaultProps = {
    align: 'left'
}

import { useEffect, useState } from 'react';
import Icon from '../icon';
import './style.css';

interface Props {
    scale: number;
    page: number;
    pages: number;
    zoomIn: () => void;
    zoomOut: () => void;
    prev: () => void;
    next: () => void;
    close: () => void;
}

const Navbar = (props: Props) => {
    const {
        scale, page, pages, zoomIn, zoomOut, prev, next, close
    } = props;
    const [visible, setVisible] = useState<boolean>(false);


    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {;
            const ratio = window.innerHeight * (2/3);
            if (e.clientY < ratio) {
                setVisible(false);
            }
            else {
                setVisible(true);
            }
        }
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        }
    }, [visible])


    if (visible)
    return (
        <div className='navbar'>
        <Icon icon='zoomIn' className='navbar-icon' onClick={zoomIn} />
        {scale.toFixed(0)}%
        <Icon icon='zoomOut' className='navbar-icon' onClick={zoomOut} />
        <div className='nav-break'></div>
        <Icon icon='previous' className='navbar-icon-2' onClick={prev} />
        <span className='nav-text'>{page}/{pages}</span>
        <Icon icon='next' className='navbar-icon-2' onClick={next} />
        <div className='nav-break'></div>
        <Icon icon='dismiss' className='navbar-icon-2' onClick={close} />
        </div>
    )
    return null;
}

export default Navbar
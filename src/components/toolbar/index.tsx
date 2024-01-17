import './style.css';
import Icon from '../icon';
import { useContext, useEffect, useRef, useState } from 'react';
import Tooltip from '../tooltip';
import { Tools, colors, tools } from '../../utils/constants';
import iconPack from '../../components/icon/iconPack.json'
import { MainContext } from '../../context';

const Toolbar = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { activeTool, setActiveTool, activeColor, setActiveColor } = useContext(MainContext);

    useEffect(() => {
        window.addEventListener('click', (e: any) => {
             if (!ref.current) return;
          if (!ref.current.contains(e.target)) {
            const color = document.getElementById('color');
            if (color?.contains(e.target)) {
              if (ref.current.style.display === 'flex') 
                ref.current.style.display = 'none'
              else
                ref.current.style.display = 'flex';
              return; 
            }
            ref.current.style.display = 'none'; 
          }
        })

        const resizeEventListener = () => {
            const height = document.body.clientHeight;
            const el = document.getElementById('toolbar');
            if (!el) return;
            if (height > 360) {
              el.style.overflowY = 'visible';
            }
            else {
              el.style.overflowY = 'auto';
            }
        }
      
        window.addEventListener('resize', resizeEventListener);
        resizeEventListener();
    
        return () => {
        window.removeEventListener('resize', resizeEventListener);
        }
    }, [ref])
   
    return (
        <div id='toolbar' className='toolbar'>
            {
              tools.map(({tool, icon, label}, index) => {
                if (tool === 'color') return (
                  <div key={index}>
                    <div
                      id="color"
                      className={`color ${activeColor}`}
                      onClick={() => setActiveTool('color')}
                    ></div>
                  </div>
                )
                return (
                    <Tooltip key={index} label={label}>
                      <Icon
                        icon={icon as keyof typeof iconPack}
                        className='toolbar-icon'
                        active={tool === activeTool}
                        onClick={() => setActiveTool(tool)} />
                    </Tooltip>
                )
              })
            }
            <div
                ref={ref}
                className="color-selector"
            >
                {colors.map((color, index) => (
                    <div
                    onClick={() => setActiveColor(color)}
                    key={index}
                    className={`color ${color} ${color === activeColor ? 'active-color' : ''}`}></div>
                ))}
            </div>
        </div>
    )
}

export default Toolbar
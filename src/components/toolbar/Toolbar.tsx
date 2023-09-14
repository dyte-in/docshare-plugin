import './toolbar.css';
import { Icon, Tooltip } from '..';
import { ToolbarState } from '../../utils/types';
import { colors, tools } from '../../utils/contants';
import { useContext, useEffect, useRef } from 'react';
import { MainContext } from '../../context';


interface ToolbarRightProps {
  activeColor: string;
  activeTool: ToolbarState;
  onBack: () => void;
  setActiveColor: (col: string) => void;
  selectActiveTool: (state: ToolbarState) => void;
}

interface ToolbarLeftProps {
  onNext: () => void;
  onPrev: () => void;
  pageCount: number;
  currentPage: number;
}

interface ToolbarTopProps {
  scale: number;
  selectActiveTool: (state: ToolbarState) => void;
}

const ToolbarRight = (props: ToolbarRightProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const {
    activeTool,
    activeColor,
    onBack,
    setActiveColor,
    selectActiveTool,
  } = props;
  const { isRecorder } = useContext(MainContext);

  useEffect(() => {
    window.onclick = (e: any) => {
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
    }

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
    
  }, [])

  return (
    <div className="toolbar-right">
        <Tooltip label="Dismiss" align='bottom-left'>
        <Icon icon="dismiss" className="back-icon" onClick={onBack} />
        </Tooltip>
        {
          !isRecorder && (
            <div className="toolbar-tools" id="toolbar">
              {
                tools.map(({icon, tool, label }, index) => (
                  <Tooltip key={index} label={label}>
                  <Icon key={tool} icon={icon} onClick={() => selectActiveTool(tool)} className={`toolbar-drawing-icon ${activeTool === tool ? 'active' : ''}`}/>
                  </Tooltip>
                ))
              }
              <div id="color" className={`color ${activeColor}`}></div>
              <div ref={ref} className="color-selector">
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
    </div>
  )
}

const ToolbarLeft = (props: ToolbarLeftProps) => {
  const { onNext, onPrev, pageCount, currentPage } = props;

  return (
    <div className="toolbar-left">
      <div className="toolbar-page">
        <Tooltip label="Previous" align='bottom-right'>
        <Icon onClick={onPrev} className="toolbar-icon" icon='previous' />
        </Tooltip>
        Page {currentPage}/{pageCount}
        <Tooltip label="Next" align='bottom-right'>
        <Icon onClick={onNext} className="toolbar-icon" icon='next' />
        </Tooltip>
      </div>
    </div>
  )
}

const ToolbarTop = (props: ToolbarTopProps) => {
  const { scale, selectActiveTool } = props;
  const updateTool = (e: ToolbarState) => {
    selectActiveTool(e)
  };
  return (
    <div className="toolbar-top">
       <Tooltip label="Zoom In" align='bottom-left'>
         <Icon onClick={() => updateTool('zoom-in-tool')} className="toolbar-icon" icon='zoomIn' />
       </Tooltip>
       <span>{Math.round(scale * 100)}%</span>
       <Tooltip label="Zoom Out" align='bottom-left'>
       <Icon onClick={() => updateTool('zoom-out-tool')} className="toolbar-icon" icon='zoomOut' />
       </Tooltip>
     </div>
 )
}
export {
  ToolbarRight,
  ToolbarLeft,
  ToolbarTop,
}

import './style.css';
import { MainContext } from '../../../context';
import Navbar from '../../../components/navbar';
import { useContext, useEffect, useRef, useState } from 'react';
import { GoogleDimensions } from '../../../utils/constants';
import useAnnotation from '../../../hooks/useAnnotation';
import Toolbar from '../../../components/toolbar';
import { color } from '../../../utils/annotations';

const DEFAULT_DIMENSIONS: GoogleDimensions = {
  x: 1280,
  y: 720,
};

let PAGE = 1;

const SlidesViewer = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const {
    doc,
    user,
    page,
    hostId,
    plugin,
    setPage,
    setData,
    isRecorder,
    activeColor,
    setAnnStore,
    handleKeyPress,
  } = useContext(MainContext);
  const [svgDimensions, setSvgDimensions] = useState<{x: number; y: number}>();

  const {
    state,
    onMouseUp,
    dimensions, 
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onTouchMove,
    onTouchStart,
    setDimensions,
  } = useAnnotation({
    page,
    doc: ref,
    svg: svgRef,
    viewer: 'google',
  });

  // On document load & scale change
  useEffect(() => {
    updateDimensions();
  }, [scale])

  // On window resize
  useEffect(() => {
    PAGE = page
    window.onresize = () => {
      updateDimensions();
    }
  }, [])

  // On document scroll
  useEffect(() => {
    if (!plugin || hostId !== user.id) return;
    const el = document.getElementById('slides-viewer-container');
    if (!el) return;
    const scrollListener = (e: any) => {
      const scrollObj = {
        x: e.target.scrollLeft / e.target.scrollWidth,
        y: e.target.scrollTop / e.target.scrollHeight,
      }
      plugin.emit('syncScroll', scrollObj);
    }
    el.addEventListener("scroll", scrollListener);

    return () => {
      el.removeEventListener('scroll', scrollListener)
    }
  }, [plugin, hostId, user])


  // Listen for zoom & scroll events from host
  useEffect(() => {
    if (!plugin || !isRecorder) return;
    plugin.addListener('syncZoom', ({ zoom }: { zoom: number }) => {
      updateDimensions();
      setScale(zoom);
    })
    plugin.addListener('syncScroll', ({ x, y }: { x: number; y: number; }) => {
      console.log(x, y);
      const el = document.getElementById('slides-viewer-container');
      if (!el) return;
      el.scrollTo({
        top: y * el.scrollHeight,
        left: x * el.scrollWidth,
        behavior: 'smooth',
      });
    })
    return () => {
      plugin.removeListeners('syncZoom');
      plugin.removeListeners('syncScroll');
    }
  }, [plugin, isRecorder])

  // Helper Methods
  const updateDimensions = () => {
    const ratio = (dimensions?.y ?? DEFAULT_DIMENSIONS.y) / (dimensions?.x ?? DEFAULT_DIMENSIONS.x);
    let x = window.innerWidth;
    let y = x * ratio;
    if (y > window.innerHeight) {
      y = window.innerHeight;
      x = (y/ratio);
    }
    const cont = document.getElementById('slides-viewer-container');
    const dv = document.getElementById('slides-viewer-overlay');
    if ( y * scale > window.innerHeight) {
      cont?.classList.remove('slide-y-center');
      dv?.classList.remove('overlay-y-center');
    } else {
      cont?.classList.add('slide-y-center');
      dv?.classList.add('overlay-y-center');
    }

    if (x * scale > window.innerWidth) {
      cont?.classList.remove('slide-x-center');
      dv?.classList.remove('overlay-x-center');
    } else {
      cont?.classList.add('slide-x-center');
      dv?.classList.add('overlay-x-center');
    }
    setDimensions({ x: x * scale, y: y * scale});
  }

  useEffect(() => {
    if (!svgDimensions) {
      setSvgDimensions(dimensions);
    }
  }, [dimensions])

  // Handling pagination events from google's iframe
  useEffect(() => {
    const handlePostMessage = ({data}: any) => {
      if (data.event === 'load') {
        setLoading(false);
        setPages(parseInt(data.set));
      }
      if (data.event === 'keypress') {
        handleKeyPress(data.code);
        setPage(parseInt(data.page));
      }
    }
    window.addEventListener('message', handlePostMessage);
    return () => {
      window.removeEventListener('message', handlePostMessage);
    }
  }, []);

  // Navbar Methods
  const zoomIn = () => {
    syncZoom(scale + 0.05);
    setScale(scale + 0.05);
  };
  const zoomOut = () => {
    syncZoom(scale - 0.05);
    setScale(scale - 0.05);
  };
  const syncZoom = (zoom: number) => {
    if (hostId !== user.id) return;
    plugin.emit('syncZoom', { zoom });
  }
  const close = async () => {
    for(let i = 1; i <= pages; i++) {
      try {
        await plugin.stores.delete(`annotation-page-${i}`);
      } catch (e) {};
    }
    setData(undefined);
    setAnnStore(undefined);
    setPage(1);
  };
  const handlePrevPage = () => {
    const iframe = document.getElementById('slides-viewer') as HTMLIFrameElement;
    iframe?.contentWindow?.postMessage({ event: 'keydown', code: 37 }, '*');
  }
  const handleNextPage = () => {
    const iframe = document.getElementById('slides-viewer') as HTMLIFrameElement;
    iframe?.contentWindow?.postMessage({ event: 'keydown', code: 39 }, '*');
  }

  return (
    <div id='slides-viewer-container'>
      {
        loading && 
        <div className='slides-viewer-loader'>
          Loading your document ...
        </div>
      }
      <iframe
        src={`${doc?.url}?slide=${PAGE}`}
        width={dimensions?.x ?? DEFAULT_DIMENSIONS.x}
        height={dimensions?.y ?? DEFAULT_DIMENSIONS.y}
        id='slides-viewer'
      ></iframe>
      <div
        ref={ref}
        id="slides-viewer-overlay"
        className='overlay-slides'
        style={{
          height: `${dimensions?.y}px`,
          width: `${dimensions?.x}px`,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
      >
        {
          svgDimensions?.x && svgDimensions?.y && (
            <svg 
              id='svg'
              ref={svgRef}
              xmlns="http://www.w3.org/2000/svg"
              className={state !== 'idle' ? 'active-cursor' : ''}
              viewBox={`0 0 ${DEFAULT_DIMENSIONS.x} ${DEFAULT_DIMENSIONS.y}`}
            ></svg>
          )
        }
        <div id="tracer-element"></div>
        <textarea 
        id="text-tool"
        maxLength={201}
        placeholder='200 characters allowed'
        style={{ color: color(activeColor) }}></textarea> 
      </div>
      
      <Navbar
        scale={scale * 100}
        page={page}
        pages={pages}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        close={close} 
        prev={handlePrevPage}
        next={handleNextPage}
      />
      <Toolbar/>
    </div>
  )
}

export default SlidesViewer

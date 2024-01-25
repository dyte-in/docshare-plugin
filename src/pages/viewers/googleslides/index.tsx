import './style.css';
import { debounce } from 'lodash';
import { MainContext } from '../../../context';
import Navbar from '../../../components/navbar';
import { useContext, useEffect, useRef, useState } from 'react';
import { GoogleDimensions, googleID } from '../../../utils/constants';
import useAnnotation from '../../../hooks/useAnnotation';
import Toolbar from '../../../components/toolbar';
import { color } from '../../../utils/annotations';
import { DyteStore } from '@dytesdk/plugin-sdk';

const DEFAULT_DIMENSIONS: GoogleDimensions = {
  x: 1280,
  y: 720,
};

const SlidesViewer = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  
  const [loading, setLoading] = useState<boolean>(true);
  const {
    svgRef,
    doc,
    user,
    page,
    hostId,
    plugin,
    pages,
    setKeys,
    setPage,
    setPages,
    setData,
    setActions,
    initialPage,
    updating,
    setUpdating,
    actions,
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
      el.removeEventListener('scroll', scrollListener);
    }
  }, [plugin, hostId, user])

  // On key press
  useEffect(() => {
    const keyDownHandler = debounce((e: any) => {
      if (e.keyCode === 39) handleNextPage();
      if (e.keyCode === 37) handlePrevPage();
    },100)
    window.addEventListener('keydown', keyDownHandler)
    return () => {
      window.removeEventListener('keydown', keyDownHandler)
    }
  }, [page])


  // Listen for zoom & scroll events from host
  useEffect(() => {
    if (!plugin || !isRecorder) return;
    plugin.addListener('syncZoom', ({ zoom }: { zoom: number }) => {
      updateDimensions();
      setScale(zoom);
    })
    plugin.addListener('syncScroll', ({ x, y }: { x: number; y: number; }) => {
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

  useEffect(() => {
    if (!plugin) return;
    plugin.addListener('closePlugin', () => {
      setUpdating(true);
    })
    return () => {
      plugin.removeListeners('closePlugin')
    }
  }, [])

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
    setUpdating(true);
    plugin.emit('closePlugin');
    const KeyStore: DyteStore = plugin.stores.get('keys');
    for(let i = 1; i <= pages; i++) {
      try {
        await plugin.stores.delete(`annotation-page-${i}`);
        KeyStore.delete(i.toString());
      } catch (e) {};
    };
    setAnnStore(undefined);
    await setPage(1);
    await setData(undefined);
  };

  const handlePrevPage = async () => {
    await setKeys(37);
    const iframe = document.getElementById('slides-viewer') as HTMLIFrameElement;
    iframe?.contentWindow?.postMessage({ event: 'keydown', code: 37 }, '*');
  }
  const handleNextPage = async () => {
    await setKeys(39);
    const iframe = document.getElementById('slides-viewer') as HTMLIFrameElement;
    iframe?.contentWindow?.postMessage({ event: 'keydown', code: 39 }, '*');
  }

  // Handling pagination events from google's iframe
  useEffect(() => {
    const handlePostMessage = ({data}: any) => {
      if (data.event === 'load') {
        setLoading(false);
        setPages(parseInt(data.set));
        plugin.room.emitEvent('page-changed', { page: initialPage, presentationId: doc.url.match(googleID)?.[0] });
        const iframe = document.getElementById('slides-viewer') as HTMLIFrameElement;
        if (actions?.length > 0) {
          iframe?.contentWindow?.postMessage({ event: 'update-actions', actions }, '*');
        }
        setUpdating(false);
      }
      if (data.event === 'page') {
        if (updating) return;
        setPage(parseInt(data.page), page);
      }
      if (data.event === 'keypress') {
        handleKeyPress(data.code);
      }
      if (data.event === 'actions-updated') {
        setActions([]);
      }
    }
    window.addEventListener('message', handlePostMessage);
    return () => {
      window.removeEventListener('message', handlePostMessage);
    }
  }, [page, actions, updating]);

  return (
    <div id='slides-viewer-container'>
      {
        (loading || actions?.length > 0) && 
        <div className='slides-viewer-loader'>
          Loading your document ...
        </div>
      }
      <iframe
        src={`${doc?.url}?slide=${initialPage}`}
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

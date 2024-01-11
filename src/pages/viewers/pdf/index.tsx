import './style.css';
import 'core-js/features/array/at';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

import { MainContext } from '../../../context';
import { pdfjs, Document, Page } from 'react-pdf';
import CanvasRef from '../../../hooks/StatefulRef';
import { pdfOptions } from '../../../utils/constants';
import { useContext, useEffect, useRef, useState } from 'react';
import Navbar from '../../../components/navbar';
import Toolbar from '../../../components/toolbar';
import useAnnotation from '../../../hooks/useAnnotation';
import { color } from '../../../utils/annotations';


pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.js',
  import.meta.url,
).toString();


export default function PDFDocument() {
  const {
    doc,
    page,
    user,
    plugin,
    hostId,
    setPage,
    setData,
    isRecorder,
    activeColor,
    setAnnStore,
  } = useContext(MainContext);
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [pages, setPages] = useState<number>(0);
  const [ref, onRefChange, setRef] = CanvasRef();
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>();

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
    viewer: 'pdf',
  });

  // On window resize
  useEffect(() => {
    window.onresize = () => {
      updateDimensions();
      updateStyle();
    }
  }, [onRefChange, dimensions])

  // On document load and scale change
  useEffect(() => {
    if (!ref.current) return;
    updateDimensions();
  }, [onRefChange, scale])

  // On document scroll
  useEffect(() => {
    if (!plugin || hostId !== user.id) return;
    const el = document.getElementById('cont');
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
      const el = document.getElementById('cont');
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

  // On document load
  const onLoad = ({ numPages }: {numPages: number}) => {
    setPages(numPages);
  }

  // Helper Methods
  const updateDimensions = () => {
    if (!ref.current) return;
    // set dimensions
    const initX = parseFloat(ref.current.style.width.replace('px', ''));
    const initY = parseFloat(ref.current.style.height.replace('px', ''));
    const winR = window.innerWidth / window.innerHeight;
    const docR = initX / initY;

    const or = initX > initY ? 'landscape' : 'portrait';

    if (docR > winR) {
      ref.current.style.width = `${window.innerWidth * scale}px`;
      ref.current.style.height = `${(initY * window.innerWidth * scale)/initX}px`;
      ref.current.classList.remove('auto-width');
      ref.current.classList.add('auto-height');
    } else {
      ref.current.style.height = `${window.innerHeight * scale}px`;
      ref.current.style.width = `${(initX * window.innerHeight * scale)/initY}px`;
      ref.current.classList.remove('auto-height');
      ref.current.classList.add('auto-width');
    }
    
    setOrientation(or);
    if (!dimensions) {
      setDimensions({ x: initX, y: initY });
    }
  }
  const updateStyle = () => {
    const cont = document.getElementById('cont');
    if (!ref.current || !cont) return;
    const contH = window.innerHeight;
    const contW = window.innerWidth;
    const docH = ref.current.clientHeight;
    const docW = ref.current.clientWidth;

    let heightModifier: any = 'alignItems';
    let widthModifier: any = 'justifyContent';

    if (orientation === 'landscape') {
      heightModifier = 'justifyContent';
      widthModifier = 'alignItems';
    }

    if (docH > contH) cont.style[heightModifier] = 'flex-start';
    else cont.style[heightModifier] = 'center';

    if (docW > contW) cont.style[widthModifier] = 'flex-start';
    else cont.style[widthModifier] = 'center';
  }
  useEffect(() => {
    updateStyle();
  }, [scale])


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
  const prevPage = () => {
    if (page === 1) return;
    setPage(page - 1)
  };
  const nextPage = () => {
    if (page === pages) return;
    setPage(page + 1)
  };
  const close = async () => {
    for(let i = 1; i <= pages; i++) {
      try {
        await plugin.stores.delete(`annotation-page-${i}`);
      } catch (e) {};
    }
    
    setAnnStore(undefined);
    setData(undefined);
    setPage(1);
  };

  return (
    <div id="cont" className="pdf-viewer-container">
      <Document
        onLoadSuccess={onLoad}
        file={doc}
        options={pdfOptions}>
        <Page
          scale={scale}
          canvasRef={setRef}
          key={`page_${page}`}
          pageNumber={page}
          renderMode='canvas'
          renderAnnotationLayer={false}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onMouseMove={onMouseMove}
          onTouchMove={onTouchMove}
          onMouseUp={onMouseUp}
          onTouchEnd={onTouchEnd}
        >
          {dimensions?.x && dimensions?.y && (
            <svg 
              id='svg'
              ref={svgRef}
              xmlns="http://www.w3.org/2000/svg"
              className={`${state === 'drawing' ? 'active-cursor' : ''}`}
              viewBox={`0 0 ${dimensions?.x} ${dimensions?.y}`}
            ></svg>
          )}
           <div id="tracer-element"></div>
           <textarea 
            id="text-tool"
            maxLength={201}
            placeholder='200 characters allowed'
            style={{ color: color(activeColor) }}></textarea>    
        </Page>
      </Document>
      <Navbar
        scale={scale * 100}
        page={page}
        pages={pages}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        close={close} 
        prev={prevPage}
        next={nextPage}
      />
      <Toolbar />
    </div>
  );
}

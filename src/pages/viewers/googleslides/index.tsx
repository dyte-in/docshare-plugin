import './style.css';
import { MainContext } from '../../../context';
import Navbar from '../../../components/navbar';
import { useContext, useEffect, useState } from 'react';
import { GoogleDimensions } from '../../../utils/constants';

const DEFAULT_DIMENSIONS: GoogleDimensions = {
  x: 1280,
  y: 720,
};
const SlidesViewer = () => {
  const [scale, setScale] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const { doc, page, setPage, setData } = useContext(MainContext);
  const [ dimensions, setDimensions ] = useState<GoogleDimensions>(DEFAULT_DIMENSIONS)

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

  // Helper Methods
  const updateDimensions = () => {
    const ratio = dimensions.y/dimensions.x;
    let x = window.innerWidth;
    let y = x * ratio;
    if (y > window.innerHeight) {
      y = window.innerHeight;
      x = (y/ratio);
    }
    const cont = document.getElementById('slides-viewer-container');
    if ( y * scale > window.innerHeight) {
      cont?.classList.remove('slide-y-center');
    } else {
      cont?.classList.add('slide-y-center');
    }

    if (x * scale > window.innerWidth) {
      cont?.classList.remove('slide-x-center');
    } else {
      cont?.classList.add('slide-x-center');
    }
    setDimensions({ x: x * scale, y: y * scale});
  }

  // Handling pagination events from google's iframe
  useEffect(() => {
    const handlePostMessage = ({data}: any) => {
      if (data.event === 'load') {
        setLoading(false);
        setPages(parseInt(data.set));
      }
      if (data.event === 'keypress') {
        console.log(data);
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
    // syncZoom(scale + 0.05);
    setScale(scale + 0.05);
  };
  const zoomOut = () => {
    // syncZoom(scale - 0.05);
    setScale(scale - 0.05);
  };
  const close = async () => {
    setData(undefined);
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
        src={doc?.url}
        width={dimensions.x}
        height={dimensions.y}
        id='slides-viewer'
      ></iframe>
      <svg 
        id='svg'
        xmlns="http://www.w3.org/2000/svg"
        className={scale > 1 ? '' : 'svg-top-auto'}
        style={{
          height: `${dimensions.y}`,
          width: `${dimensions.x}`,
        }}
        viewBox={`0 0 ${dimensions?.x} ${dimensions?.y}`}
      ></svg>
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
    </div>
  )
}

export default SlidesViewer

/**
 * TODO:
 * 1. add collaborative pagination
 * 2. add collaborative annotations
**/

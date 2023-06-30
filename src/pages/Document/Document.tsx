import './document.css';
import 'core-js/features/array/at';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useContext, useEffect, useRef, useState } from 'react';
import {ToolbarRight, ToolbarLeft } from '../../components';
import CanvasRef from '../../hooks/StatefulRef';
import { color, throttle } from '../../utils/helpers';
import { CursorPoints, ToolbarState } from '../../utils/types';
import { options } from '../../utils/contants';
import { MainContext } from '../../context';
import DytePlugin from '@dytesdk/plugin-sdk';
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.js',
  import.meta.url,
).toString();

let EL_COUNT = 0;

interface DocumentProps {
  plugin: DytePlugin,
}

export default function PDFDocument(props: DocumentProps) {
  const { plugin } = props;
  const tool = useRef<ToolbarState>('none');
  const selectedElements = useRef<Set<string>>(new Set());
  const [docEl, docElUpdate, docElRef] = CanvasRef();
  const { annStore, setDocument, doc, currentPage, setCurrentPage, userId, setAnnStore } = useContext(MainContext);

  const [scale, setScale] = useState<number>(1);
  const [draw, setDraw] = useState<boolean>(false);
  const [pageCount, setPageCount] = useState<number>(0);
  const [activeColor, setActiveColor] = useState<string>('black');
  const [activeTool, setActiveTool] = useState<ToolbarState>('none');
  const [dimensions, setDimensions] = useState<{x: number; y: number}>();
  const [points, setPoints] = useState<CursorPoints>({xP: -1, xC: -1, yP: -1, yC: -1});

  // initial document load
  useEffect(() => {
    if (!docEl.current) return;

    // add classes
    const x = docEl.current.clientWidth;
    const y = docEl.current.clientHeight;
    if (x === 0 && y === 0) return;
    if (!dimensions) {
      setDimensions({ x, y });
    }

    // add styles
    if (scale > 1) {
      docEl.current?.classList.remove('min-height-canvas');
    } else {
      docEl.current.classList.add('max-height-canvas');
    }
    

    // reset scale
    window.onresize = () => {
      setScale(1);
      if (!docEl.current) return;
      updateDocPosition();
      docEl.current.classList.add('min-height-canvas');
    }
  }, [docElUpdate])

  // tools
  useEffect(() => {
    if (activeTool === 'drawing-tool-erase-all') eraseAll();
    if (activeTool === 'zoom-in-tool') zoomIn();
    if (activeTool === 'zoom-out-tool') zoomOut();
    if (activeTool === 'export-tool') exportPage();
  }, [activeTool, draw])

  // adjust styles according to scale
  useEffect(() => {
    if (scale <= 1) {
      docEl.current?.classList.add('max-height-canvas');
    }
  }, [scale])

  // Helper Methods
  const handleNext = () => {
    setCurrentPage(Math.min(currentPage+1, pageCount))
    if (!docEl.current) return;
    updateDocPosition();
    docEl.current.classList.add('min-height-canvas');
  }
  const handlePrev = () => {
    setCurrentPage(Math.max(currentPage-1, 1))
    if (!docEl.current) return;
    updateDocPosition();
    docEl.current.classList.add('min-height-canvas');
  }
  const onDocumentLoadSuccess = ({ numPages }: {numPages: number}) => {
    setPageCount(numPages);
    if (numPages > 0) {
      if (currentPage === 0) setCurrentPage(1);
    }
  }
  const selectActiveTool = (state: ToolbarState) => {
    tool.current = state;
    setActiveTool(state);
  }
  const selectColor = (col: string) => {
    setActiveColor(col);
  }
  const getCoords = (x: number, y: number) => {
    const svg = document.getElementById('svg');
    if (!svg) return { x: 0, y: 0};
    const rect = svg.getBoundingClientRect();
    const xPos = getX(x - rect.x);
    const yPos = getY(y - rect.y);
    return {x: xPos, y: yPos};
  }
  const getX = (x: number) => {
    const el = docEl.current;
    if (!el || x < 0) return 0;
    return Math.min(x, el.clientWidth);
  }
  const getY = (y: number) => {
    const el = docEl.current;
    if (!el || y < 0) return 0;
    return Math.min(y, el.clientHeight);
  }
  const getScale = () => {
    if (!docEl.current) return {xS: 1, yS: 1};
    const x = docEl.current.clientWidth;
    const y = docEl.current.clientHeight;
    if (!dimensions) {
      setDimensions({x, y});
      return {xS: 1, yS: 1};
    }
    if (x === dimensions.x && y === dimensions.y) return {xS: 1, yS: 1};
    return {
      xS: x/dimensions.x,
      yS: y/dimensions.y,
    };
  }
  const enableTracer = (x: number, y: number) => {
    const elem = document.getElementById('tracer-element');
    if (!elem) return;
    elem.style.display = 'flex';
    if (x < points.xP) {
      elem.style.left = `${x}px`;
      elem.style.width = `${points.xP - x}px`;
    } else {
      elem.style.left = `${points.xP}px`;
      elem.style.width = `${x - points.xP}px`;
    }
  
    if (y < points.yP) {
      elem.style.top = `${y}px`;
      elem.style.height = `${points.yP - y}px`;
    } else {
      elem.style.top = `${points.yP}px`;
      elem.style.height = `${y - points.yP}px`;
    }
  }
  const disableTracer = () => {
    const elem = document.getElementById('tracer-element');
    if (!elem) return;
    elem.style.display = 'none';
    elem.style.left = '0';
    elem.style.top = '0';
    elem.style.width = '100';
    elem.style.height = '100';
  }
  const updateDocPosition = () => {
    const cont = document.getElementById('cont');
    if (!docEl.current || !cont) return;
    if (docEl.current.clientWidth < window.innerWidth) {
      cont.style.justifyContent = 'center';
    } else { 
      cont.style.justifyContent = 'start';
    }
  }

  // Cursor Listeners
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const { x, y } = getCoords(e.clientX, e.clientY);
    if (activeTool === 'drawing-tool-pencil' || activeTool === 'drawing-tool-highlight') startPath(x, y);
    setPoints({
      ...points,
      xP: x,
      yP: y,
    })
    setDraw(true);
  }
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!draw) return;
    e.stopPropagation();
    e.preventDefault();

    const { x, y } = getCoords(e.clientX, e.clientY);
    if (activeTool === 'drawing-tool-shape' || activeTool === 'drawing-tool-text') enableTracer(x, y); 
    if (activeTool === 'drawing-tool-pencil' || activeTool === 'drawing-tool-highlight') updatePath(x, y);
    setPoints({
      ...points,
      xC: x,
      yC: y,
    })
  }
  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const { x, y } = getCoords(e.clientX, e.clientY);
    if (activeTool === 'drawing-tool-shape') drawRect(x, y);
    if (activeTool === 'drawing-tool-text') drawText(x, y);
    if (activeTool === 'drawing-tool-erase') eraseElements();
    if (activeTool === 'drawing-tool-pencil' || activeTool === 'drawing-tool-highlight') endPath();
    setDraw(false);
  }

  const updateAnnotations = async (html: string, id: string) => {
    await annStore?.set(id, html);
  }

  useEffect(() => {
    plugin.addListener('remote-erase-all', () => {
      eraseAll(true);
    });
    return () => {
      plugin.removeListeners('remote-erase-all');
    }
  }, [])

  // update remote annotations
  useEffect(() => {
    if (!annStore) return;
    // subscribe to data changes
    annStore.subscribe('*', (a: any) => {
      const key = Object.keys(a)[0];
      const value = a[key];

      if (value) {
        // shape added
        const svg = document.getElementById('svg');
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.innerHTML = value;
        if (!svg) return;
        svg.appendChild(g);
        const el = document.getElementById(key);
        el?.addEventListener('mousemove', () => {
          selectElement(el);
        })
        return;
      }
      // shape deleted
      const el =  document.getElementById(key);
      const p = el?.parentElement;
      if (p && p.nodeName === 'g') {
          p?.remove();
      } else {
        el?.remove();
      }
    })
  }, [annStore])
  // load inital annotations
  useEffect(() => {
    if (!annStore || !dimensions) return;
    const svg = document.querySelector('svg');
    const data = annStore.getAll();
   
    if (!svg) return;
    svg.innerHTML = '';

    for (const id in data) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.innerHTML = data[id];
      svg.appendChild(g);
      const el = document.getElementById(id);
      el?.addEventListener('mousemove', () => {
        selectElement(el);
      })
    }
  }, [dimensions, annStore])

  // Draw & Highlight
  const startPath = (x: number, y: number) => {
    const svg = document.getElementById('svg') as any;
    const path = document.createElementNS('http://www.w3.org/2000/svg','path'); 
    path.setAttribute('stroke-linejoin', 'round');
    path.onmouseenter = () => {
      selectElement(path);
    }
    path.setAttribute('id',`${userId}-${EL_COUNT}`);
    if (activeTool === 'drawing-tool-pencil') {
      path.style.stroke = color(activeColor);
      path.style.strokeWidth = '4';
      path.style.fill = 'none';
    } else {
      path.style.stroke = `${color(activeColor)}6e`;
      path.style.strokeWidth = '12';
      path.style.fill = 'none';
    }
    if (!svg || !path) return;
    let point = svg.createSVGPoint() as SVGPoint;
    const { xS, yS} = getScale();
    point.x = x / xS;
    point.y = y / yS;
    path.setAttribute('d', 'M'+point.x+','+point.y+'L'+point.x+','+point.y);
    svg.appendChild(path);
  };
  const updatePath = (x: number, y: number) => {
    const svg = document.getElementById('svg') as any;
    const path = document.getElementById(`${userId}-${EL_COUNT}`) as SVGPathElement | null;
    if (!svg || !path) return;
    let point = svg.createSVGPoint() as SVGPoint;
    const { xS, yS} = getScale();
    point.x = x / xS;
    point.y = y / yS;
    path.setAttribute('d', path.getAttribute('d')+' '+point.x+','+point.y);
  };
  const endPath = () => {
    const el = document.getElementById(`${userId}-${EL_COUNT}`);
    EL_COUNT++;
    if (!el?.outerHTML) return;
    updateAnnotations(el.outerHTML, el.id);
  };

  // Erase & Erase All
  const eraseAll = (remote: boolean = false) => {
    const svg = document.getElementById('svg');
    if (!svg) return;
    svg.innerHTML = '';
    if (remote) return;
    plugin.emit('remote-erase-all');
    plugin.stores.delete(annStore.name);
    const AnnotationStore = plugin.stores.create(`annotation-page-${currentPage}`);
    setAnnStore(AnnotationStore)
  }

  // Rect
  const drawRect = (x: number, y: number) => {
    disableTracer();
    const {xS, yS} = getScale();
    const svg = document.getElementById('svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', `${userId}-${EL_COUNT}`);
    EL_COUNT++;
    rect.setAttribute('rx', '8')
    rect.onmouseenter = () => {
      selectElement(rect);
    }
    const l = Math.min(points.xP, x)/ xS;
    const t = Math.min(points.yP, y) /yS;
    const w = Math.max(points.xP, x) / xS;
    const h = Math.max(points.yP, y) / yS;
    rect.setAttribute('x', l.toString());
    rect.setAttribute('y', t.toString());
    rect.setAttribute('width', (w-l).toString());
    rect.setAttribute('height', (h-t).toString());
    rect.style.stroke = color(activeColor);
    rect.style.strokeWidth = '4';
    rect.style.fill = 'none';
    svg?.appendChild(rect);
    if (!rect?.outerHTML) return;
    updateAnnotations(rect.outerHTML, rect.id);
  };

  // Text
  const drawText = (x: number, y: number) => {
    disableTracer();
    const l = Math.min(points.xP, x);
    const t = Math.min(points.yP, y);
    const w = Math.max(points.xP, x);
    const h = Math.max(points.yP, y);

    const elem = document.getElementById('text-tool') as HTMLTextAreaElement;
    if (!elem) return;
    elem.style.display = 'flex';
    elem.style.left = `${l}px`;
    elem.style.width = `${w-l}px`;
    elem.style.top = `${t}px`;
    elem.style.height = `${h-t}px`;
    elem.focus();
    expandTextArea(x, y);
    selectActiveTool('drawing-tool-cursor')
    elem.onblur =() => {
      pasteText();
    }
  }
  const expandTextArea = (xC: number, yC: number) => {
    const elem = document.getElementById('text-tool') as HTMLTextAreaElement;
    if (!docEl.current) return;
    const xD = docEl.current.clientWidth;
    const yD = docEl.current.clientHeight;
    elem.onkeyup = (e) => {
      if (e.key === 'Backspace') {
        if (
          elem.scrollHeight <= elem.clientHeight
          && elem.clientWidth > Math.abs(xC - points.xP)
        )  {
          elem.style.width = `${Math.max(elem.clientWidth - 15)}px`;
        } 
        if (
          elem.scrollHeight <= elem.clientHeight
          && elem.clientHeight > Math.abs(yC - points.yP)
        ) {
          elem.style.height = `${Math.max(elem.clientHeight - 20)}px`
        }
      } else {
        if (
          elem.clientWidth + elem.offsetLeft < xD - 10
          && elem.clientWidth < 200
          && elem.scrollHeight > elem.clientHeight
        ) {
          elem.style.width = `${Math.max(elem.clientWidth + 15)}px`;
        } else if (
          elem.clientHeight + elem.offsetTop < yD - 20
          && elem.clientHeight < 300
          && elem.scrollHeight > elem.clientHeight
        ) {
          elem.style.height = `${Math.max(elem.clientHeight + 30)}px`;
        }
      }
    }
  }
  const pasteText = () => {
    const elem = document.getElementById('text-tool') as HTMLTextAreaElement;
    if (!elem) return;
    const parseNum = (str: string) => {
      return parseFloat(str.replace('px', ''));
    }

    const {xS, yS} = getScale();
    const w = elem.clientWidth / xS;
    const h = elem.clientHeight / yS;
    const t = parseNum(elem.style.top) / xS;
    const l = parseNum(elem.style.left) /yS;

    const svg = document.getElementById('svg');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    text.onmouseenter = () => {
      selectElement(text);
    }

    text.setAttribute('x', (l + 6).toString());
    text.setAttribute('y', (t + 6).toString());
    text.setAttribute('width', w.toString());
    text.setAttribute('height', h.toString());
    text.setAttribute('id', `${userId}-${EL_COUNT}`);

    EL_COUNT++;
    text.innerHTML = `<div style="width:${w}px; height:${h}px; color:${color(activeColor)}">${elem.value}</div>`;
    text.style.fontSize = '14px';
    text.style.fontFamily = 'Open Sans';
    svg?.appendChild(text);
    elem.style.display = 'none';
    if (!text?.outerHTML) return;
    updateAnnotations(text.outerHTML, text.id);
  }

  // Erase
  const selectElement = (e: any) => {
    if (tool.current !== 'drawing-tool-erase') return;
    e.style.opacity = '0.4';
    selectedElements.current.add(e.id);
  }
  const eraseElements = () => {
    selectedElements.current.forEach((e) => {
      const doc = document.getElementById(e);
      doc?.remove();
    })
    const val = Array.from(selectedElements.current);
    selectedElements.current = new Set();
    val.forEach((v) => {
      annStore.delete(v);
    })
  }

  // Zoom
  const zoomIn = () => {
    docEl.current?.classList.remove('min-height-canvas');
    setScale(scale + 0.05);
    updateDocPosition();
    selectActiveTool('none')
  };
  const zoomOut = () => {
    docEl.current?.classList.remove('min-height-canvas');
    if (scale < 0.25) return; 
    updateDocPosition();
    setScale(scale - 0.05);
    selectActiveTool('none');
  };

  // Export
  // TODO: export entire document
  const exportPage = () => {
    const doc = docEl.current;
    const svg = document.getElementById('svg');
    if (!doc || !svg) return;

    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.height = docEl.current.height;
    c.width = docEl.current.width;
    ctx.drawImage(docEl.current, 0, 0);
    
    const img = new Image();
    var xml = new XMLSerializer().serializeToString(svg);
    var svg64 = btoa(xml);
    var b64Start = 'data:image/svg+xml;base64,';
    var image64 = b64Start + svg64;
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const anchor = document.createElement('a');
      anchor.href = c.toDataURL('image/png');
      anchor.download = 'image.png';
      anchor.click();
      selectActiveTool('none');
    }
    img.src = image64;
  }

  // Go Back
  const HandleBack = () => {
    setDocument('');
  }

  return (
    <div id="cont" className="view-box">
      <Document
        onLoadSuccess={onDocumentLoadSuccess}
        file={doc}
        options={options}>
        <Page
          scale={scale}
          canvasRef={docElRef}
          key={`page_${currentPage}`}
          pageNumber={currentPage}
          renderMode='canvas'
          onMouseMove={throttle(onMouseMove, 15)} 
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          renderAnnotationLayer={false}
        >
          {dimensions?.x && dimensions?.y && (
            <svg 
            id="svg" 
            xmlns="http://www.w3.org/2000/svg"
            className={`${draw ? 'active-cursor' : ''}`}
            viewBox={`0 0 ${dimensions?.x} ${dimensions?.y}`}></svg>
          )}
          <div id="tracer-element"></div>
          <textarea 
          id="text-tool"
          maxLength={201}
          placeholder='200 characters allowed'
          style={{ color: color(activeColor) }}></textarea>    
        </Page>
      </Document>
      <ToolbarRight
        scale={scale}
        activeColor={activeColor}
        activeTool={activeTool}
        onBack={HandleBack}
        setActiveColor={selectColor}
        selectActiveTool={selectActiveTool}
      />
      <ToolbarLeft
        currentPage={currentPage}
        pageCount={pageCount}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </div>
  );
}

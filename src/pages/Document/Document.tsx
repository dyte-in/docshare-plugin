import './document.css';
import 'core-js/features/array/at';
import jsPDF from "jspdf";
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useContext, useEffect, useRef, useState } from 'react';
import {ToolbarRight, ToolbarLeft, ToolbarTop } from '../../components';
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

interface ImageDimension {
  width: number;
  height: number;
};

const A4_PAPER_DIMENSIONS = {
  width: 210,
  height: 297,
  };
  
const A4_PAPER_RATIO = A4_PAPER_DIMENSIONS.width / A4_PAPER_DIMENSIONS.height;

export default function PDFDocument(props: DocumentProps) {
  const { plugin } = props;
  const tool = useRef<ToolbarState>('none');
  const selectedElements = useRef<Set<string>>(new Set());
  const [docEl, docElUpdate, docElRef] = CanvasRef();
  const [name, setName] = useState('Document');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>();
  const {
    doc,
    base,
    userId,
    annStore,
    followId,
    isRecorder,
    setDocument,
    setAnnStore,
    currentPage, 
    setCurrentPage,
  } = useContext(MainContext);

  const [scale, setScale] = useState<number>(1);
  const [downloadMode, setDownloadMode] = useState<string>('all');
  const [draw, setDraw] = useState<boolean>(false);
  const [pageCount, setPageCount] = useState<number>(0);
  const [activeColor, setActiveColor] = useState<string>('purple');
  const [activeTool, setActiveTool] = useState<ToolbarState>('none');
  const [dimensions, setDimensions] = useState<{x: number; y: number}>();
  const [points, setPoints] = useState<CursorPoints>({xP: -1, xC: -1, yP: -1, yC: -1});

  // handle resize
  useEffect(() => {
    window.onresize = () => {
      setDocumentDimensions();
      updateStyle
    }
  }, [docElUpdate, dimensions])

  // on initial document load and scale change
  useEffect(() => {
    if (!docEl.current) return;
    setDocumentDimensions();
  }, [docElUpdate, scale])

  useEffect(() => {
    if (!doc) return;
    const fileName = doc.split('/')?.pop()?.replace(`${base}-`, '') ?? 'Document.pdf';
    setName(fileName);
  }, [doc])

  // tools
  useEffect(() => {
    if (activeTool === 'drawing-tool-erase-all') eraseAll();
    if (activeTool === 'zoom-in-tool') zoomIn();
    if (activeTool === 'zoom-out-tool') zoomOut();
    if (activeTool === 'export-tool') exportDoc();
  }, [activeTool, draw])

  // Helper Methods
  const setDocumentDimensions = () => {
    if (!docEl.current) return;
    // set dimensions
    const initX = parseFloat(docEl.current.style.width.replace('px', ''));
    const initY = parseFloat(docEl.current.style.height.replace('px', ''));
    const winR = window.innerWidth / window.innerHeight;
    const docR = initX / initY;
    const or = initX > initY ? 'landscape' : 'portrait';
    if (docR > winR) {
      docEl.current.style.width = `${window.innerWidth * scale}px`;
      docEl.current.style.height = `${(initY * window.innerWidth * scale)/initX}px`;
      docEl.current.classList.remove('auto-width');
      docEl.current.classList.add('auto-height');
    } else {
      docEl.current.style.height = `${window.innerHeight * scale}px`;
      docEl.current.style.width = `${(initX * window.innerHeight * scale)/initY}px`;
      docEl.current.classList.remove('auto-height');
      docEl.current.classList.add('auto-width');
    }
    setOrientation(or);
    if (!dimensions) {
      setDimensions({ x: initX, y: initY });
    }
  }

  useEffect(() => {
    updateStyle();
  }, [scale])

  const updateStyle = () => {
    const cont = document.getElementById('cont');
    if (!docEl.current || !cont) return;
    const contH = window.innerHeight;
    const contW = window.innerWidth;
    const docH = docEl.current.clientHeight;
    const docW = docEl.current.clientWidth;

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

  const handleNext = () => {
    setCurrentPage(Math.min(currentPage+1, pageCount))
    if (!docEl.current) return;
    updateDocPosition(scale);
    docEl.current.classList.add('min-height-canvas');
  }
  const handlePrev = () => {
    setCurrentPage(Math.max(currentPage-1, 1))
    if (!docEl.current) return;
    updateDocPosition(scale);
    docEl.current.classList.add('min-height-canvas');
  }
  const onDocumentLoadSuccess = ({ numPages }: {numPages: number}) => {
    setPageCount(numPages);
    if (numPages > 0) {
      if (currentPage === 0) setCurrentPage(1);
    }
  }
  const selectActiveTool = (state: ToolbarState, download?: 'doc' | 'notes') => {
    if (download) setDownloadMode(download);
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
    return {
      xS: x / dimensions.x,
      yS: y / dimensions.y,
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
  const updateDocPosition = (sc: number) => {
    const cont = document.getElementById('cont');
    if (!docEl.current || !cont) return;
    if (docEl.current.clientWidth < window.innerWidth || sc < 1) {
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

  const onTouchStart = (e: any) => {
    var touch = e.touches[0];
    var cx = touch.clientX;
    var cy = touch.clientY;
    const { x, y } = getCoords(cx, cy);
    if (activeTool === 'drawing-tool-pencil' || activeTool === 'drawing-tool-highlight') startPath(x, y);
    setPoints({
      ...points,
      xP: x,
      yP: y,
    })
    setDraw(true);
  };
  const onTouchMove = (e: any) => {
    var touch = e.touches[0];
    var cx = touch.clientX;
    var cy = touch.clientY;
    const { x, y } = getCoords(cx, cy);
    if (activeTool === 'drawing-tool-shape' || activeTool === 'drawing-tool-text') enableTracer(x, y); 
    if (activeTool === 'drawing-tool-pencil' || activeTool === 'drawing-tool-highlight') updatePath(x, y);
    setPoints({
      ...points,
      xC: x,
      yC: y,
    })
  };
  const onTouchEnd = (e: any) => {
    e.preventDefault();
    var touch = e.changedTouches[0];
    var cx = touch.clientX;
    var cy = touch.clientY;
    const { x, y } = getCoords(cx, cy);
    if (activeTool === 'drawing-tool-shape') drawRect(x, y);
    if (activeTool === 'drawing-tool-text') drawText(x, y);
    if (activeTool === 'drawing-tool-erase') eraseElements();
    if (activeTool === 'drawing-tool-pencil' || activeTool === 'drawing-tool-highlight') endPath();
    setDraw(false);
  };

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
    path.onpointerenter = () => {
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

  // Erase All
  const eraseAll = (remote: boolean = false) => {
    const svg = document.getElementById('svg');
    if (!svg) return;
    svg.innerHTML = '';
    if (remote) return;
    plugin.emit('remote-erase-all');
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
    rect.onpointerenter = () => {
      selectElement(rect);
    }
    const l = Math.min(points.xP, x)/ xS;
    const t = Math.min(points.yP, y) / yS;
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
    text.onpointerenter = () => {
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
    selectActiveTool('none');
    updateDocPosition(scale + 0.05);
    syncZoom(scale + 0.05);
    setScale(scale + 0.05);
  };
  const zoomOut = () => {
    selectActiveTool('none');
    if (scale < 0.25) return; 
    updateDocPosition(scale - 0.05);
    syncZoom(scale - 0.05);
    setScale(scale - 0.05);
  };
  const syncZoom = (zoom: number) => {
    if (followId !== userId) return;
    plugin.emit('syncZoom', { zoom });
  }
  // zoom and scroll sync listeners
  useEffect(() => {
    if (!plugin || !isRecorder) return;
    plugin.addListener('syncZoom', ({ zoom }) => {
      selectActiveTool('none');
      updateDocPosition(zoom);
      setScale(zoom);
    })
    plugin.addListener('syncScroll', ({ x, y }) => {
      const el = document.getElementById('cont');
      if (!el) return;
      const scrollX = x * el.scrollWidth;
      const scrollY = y * window.innerHeight;
      window.scrollTo({
        top: scrollY,
        left: window.screenLeft,
        behavior: 'smooth',
      });
      el.scrollTo({
        top: el.scrollTop,
        left: scrollX,
        behavior: 'smooth',
      });
    })
    return () => {
      plugin.removeListeners('syncZoom');
      plugin.removeListeners('syncScroll');
    }
  }, [plugin, isRecorder])


  // sync scroll - host
  useEffect(() => {
    if (!plugin || !followId || !userId || followId !== userId) return;
    const el = document.getElementById('cont');
    if (!el) return;
    const scrollListener = () => {
      const scrollObj = {
        x: el.scrollLeft/ el.scrollWidth,
        y: window.scrollY /window.innerHeight,
      }
      plugin.emit('syncScroll', scrollObj);
    }
    el.addEventListener("scroll", scrollListener);
    document.addEventListener("scroll", scrollListener);

    return () => {
      el.removeEventListener('scroll', scrollListener)
      document.addEventListener("scroll", scrollListener);
    }
    
  }, [plugin, followId, userId])

  // Export
  const exportOriginalDoc = () => {
    // export non-annotated doc
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function() {
      var a = document.createElement('a');
      a.href = window.URL.createObjectURL(xhr.response); // xhr.response is a blob
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
    };
    xhr.open('GET', doc);
    xhr.send();
    selectActiveTool('none');
  }
  const imageDimensionsOnA4 = (dimensions: ImageDimension) => {
    const isLandscapeImage = dimensions.width >= dimensions.height;
  
    // If the image is in landscape, the full width of A4 is used.
    if (isLandscapeImage) {
      return {
        width: A4_PAPER_DIMENSIONS.width,
        height:
          A4_PAPER_DIMENSIONS.width / (dimensions.width / dimensions.height),
      };
    }
  
    // If the image is in portrait and the full height of A4 would skew
    // the image ratio, we scale the image dimensions.
    const imageRatio = dimensions.width / dimensions.height;
    if (imageRatio > A4_PAPER_RATIO) {
      const imageScaleFactor =
        (A4_PAPER_RATIO * dimensions.height) / dimensions.width;
  
      const scaledImageHeight = A4_PAPER_DIMENSIONS.height * imageScaleFactor;
  
      return {
        height: scaledImageHeight,
        width: scaledImageHeight * imageRatio,
      };
    }
  
    // The full height of A4 can be used without skewing the image ratio.
    return {
      width: A4_PAPER_DIMENSIONS.height / (dimensions.height / dimensions.width),
      height: A4_PAPER_DIMENSIONS.height,
    };
};
  const copyAnnotation = (doc: HTMLCanvasElement, svg: HTMLElement, newDoc: any) => {
    const img = new Image();
    var xml = new XMLSerializer().serializeToString(svg);
    var svg64 = btoa(xml);
    var b64Start = 'data:image/svg+xml;base64,';
    var image64 = b64Start + svg64;
    const promise: Promise<boolean> = new Promise((resolve) => {
      img.onload = () => {
        doc.getContext('2d')?.drawImage(img, 0, 0, dimensions?.x ?? 0,
          dimensions?.y ?? 0);
          resolve(true);
      }
    })
    img.src = image64;
    return promise;
  }
  const exportAnnotatedDoc = async () => {
    const newDoc = new jsPDF();
    newDoc.deletePage(1);
    const d = await pdfjs.getDocument(doc).promise;
    for(let i = 1; i <= pageCount; i++) {
      // get page
      const p = await d.getPage(i);
      const viewport = p.getViewport({ scale: 1 });
      // render on canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = viewport.width + "px";
      canvas.style.height =  viewport.height + "px";
      var renderContext = {
        canvasContext: context as CanvasRenderingContext2D,
        viewport,
      };
      await p.render(renderContext as any).promise;
      // get annotations
      const annStore = `annotation-page-${i}`
      const annotation = plugin.stores.get(annStore)?.getAll() ?? {};
      const svg = document.getElementById('hiddensvg');
      if (!svg) return;
      svg.innerHTML = ''
      Object.values(annotation).forEach(val => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.innerHTML = val;
        svg.appendChild(g);
      });
      // render on canvas
      await copyAnnotation(canvas, svg, newDoc);
      // add to new doc
      newDoc.addPage();
      const imageDimensions = imageDimensionsOnA4({
          width: canvas.width,
          height: canvas.height,
      });
      newDoc.addImage(
        canvas.toDataURL("image/jpg"),
        'JPG',
        (A4_PAPER_DIMENSIONS.width - imageDimensions.width) / 2,
        (A4_PAPER_DIMENSIONS.height - imageDimensions.height) / 2,
        imageDimensions.width,
        imageDimensions.height,
      )
    }
    // save doc
    newDoc.save(`Notes-${name}`);
    selectActiveTool('none');
  }
  const exportDoc = () => {
   if(downloadMode == 'doc') exportOriginalDoc();
   else exportAnnotatedDoc();
  }

  // Go Back
  const HandleBack = async () => {
    for(let i = 1; i <= pageCount; i++) {
      try {
        await plugin.stores.delete(`annotation-page-${i}`);
      } catch (e) {};
    }
    setAnnStore(undefined);
    setCurrentPage(0);
    setPageCount(0)
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
          onTouchMove={throttle(onTouchMove, 15)}
          onMouseDown={onMouseDown}
          onTouchEnd={onTouchEnd}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
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
      <ToolbarTop scale={scale} selectActiveTool={selectActiveTool} />
      <ToolbarRight
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
      {dimensions?.x && dimensions?.y && (<svg id="hiddensvg" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${dimensions?.x} ${dimensions?.y}`}></svg>)}
    </div>
  );
}

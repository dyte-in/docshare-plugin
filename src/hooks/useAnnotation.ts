import React, { useContext, useEffect, useRef, useState } from 'react'
import { MainContext } from '../context';
import { color, getClientCoords, getCoords } from '../utils/annotations';
import { CursorPoints } from '../utils/constants';

interface Props {
    svg:  React.RefObject<SVGSVGElement>;
    doc: React.RefObject<any>;
    page: number;
    viewer?: 'google' | 'pdf'
}

type MouseEvent = {
    clientX: number;
    clientY: number;
    stopPropagation?: () => void;
    preventDefault?: () => void;
};

let EL_COUNT = 0;
let TOOL = '';

const DEFAULT_DIMENSIONS: any = {
  x: 1280,
  y: 720,
};

const useAnnotation = (props: Props) => {
  const {
    user,
    plugin,
    annStore,
    activeTool,
    activeColor,
    setAnnStore,
    setActiveTool,
  } = useContext(MainContext);
  const { page, svg, doc, viewer } = props;
  const selectedElements = useRef<Set<string>>(new Set());
  const [state, setState] = useState<'idle'|'drawing'>('idle');
  const [dimensions, setDimensions] = useState<{x: number; y: number}>();
  const [points, setPoints] = useState<CursorPoints>({xP: -1, xC: -1, yP: -1, yC: -1});

  const updateAnnotations = async (html: string, id: string) => {
    await annStore?.set(id, html);
  }

  useEffect(() => {
      TOOL = activeTool;
      if (activeTool === 'erase-all') eraseAll();
  }, [activeTool])

  const getScale = () => {
      if (!doc.current) return {xS: 1, yS: 1};
      const x = doc.current.clientWidth;
      const y = doc.current.clientHeight;
      if (!dimensions) {
        setDimensions({x, y});
        return {xS: 1, yS: 1};
      }
     if (viewer === 'google')
      return {
        xS: x / DEFAULT_DIMENSIONS.x,
        yS: y / DEFAULT_DIMENSIONS.y,
      };
      else 
        return {
          xS: x / dimensions.x,
          yS: y / dimensions.y,
        };
  }

  // Mouse Events

  // Start
  const onTouchStart = (e: any) => {
      const clientCoords =  getClientCoords(e);
      onMouseDown(clientCoords);
  };
  const onMouseDown = (e: MouseEvent) => {
    const {x, y} = getCoords(svg.current, e.clientX, e.clientY, doc);
    setState('drawing');
    if (activeTool === 'pencil' || activeTool === 'highlight') startPath(x, y);
    setPoints({
        ...points,
        xP: x,
        yP: y,
    });
  };
  
  // Move
  const onTouchMove = (e: any) => {
    const clientCoords =  getClientCoords(e);
    onMouseMove(clientCoords);
  };
  const onMouseMove = (e: MouseEvent) => {
    if (state !== 'drawing') return;
    const {x, y} = getCoords(svg.current, e.clientX, e.clientY, doc);
    if (activeTool === 'pencil' || activeTool === 'highlight') updatePath(x, y);
    if (activeTool === 'shape' || activeTool === 'text') enableTracer(x, y); 
    setPoints({
        ...points,
        xC: x,
        yC: y,
    })
  };

  // End
  const onTouchEnd = (e: any) => {
    const clientCoords =  getClientCoords(e);
    onMouseUp(clientCoords);
  };
  const onMouseUp = (e: MouseEvent) => {
    const {x, y} = getCoords(svg.current, e.clientX, e.clientY, doc);
    setState('idle');
    if (activeTool === 'text') drawText(x, y);
    if (activeTool === 'shape') drawRect(x, y);
    if (activeTool === 'erase') eraseElements();
    if (activeTool === 'pencil' || activeTool === 'highlight') endPath();
  };

  // Tool Helper Methods

  // Pencil & Highlighter
  const startPath = (x: number, y: number) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path'); 
    path.setAttribute('stroke-linejoin', 'round');
    path.onpointerenter = () => {
      selectElement(path);
    }
    path.setAttribute('id',`${user.id}-${EL_COUNT}`);
    if (activeTool === 'pencil') {
      path.style.stroke = color(activeColor);
      path.style.strokeWidth = '4';
      path.style.fill = 'none';
    } else {
      path.style.stroke = `${color(activeColor)}6e`;
      path.style.strokeWidth = '12';
      path.style.fill = 'none';
    }
    if (!svg.current || !path) return;
    let point = svg.current.createSVGPoint() as SVGPoint;
    const { xS, yS} = getScale();
    point.x = x / xS;
    point.y = y / yS;
    path.setAttribute('d', 'M'+point.x+','+point.y+'L'+point.x+','+point.y);
    svg.current?.appendChild(path);
  };
  const updatePath = (x: number, y: number) => {
    const path = document.getElementById(`${user.id}-${EL_COUNT}`) as SVGPathElement | null;
    if (!svg.current || !path) return;
    let point = svg.current.createSVGPoint() as SVGPoint;
    const { xS, yS} = getScale();
    point.x = x / xS;
    point.y = y / yS;
    path.setAttribute('d', path.getAttribute('d')+' '+point.x+','+point.y);
  };
  const endPath = () => {
    const el = document.getElementById(`${user.id}-${EL_COUNT}`);
    EL_COUNT++;
    if (!el?.outerHTML) return;
    updateAnnotations(el.outerHTML, el.id);
  };

  // Erase All
  const eraseAll = async (remote: boolean = false) => {
    if (!svg.current) return;
    svg.current.innerHTML = '';
    if (remote) return;
    plugin.emit('remote-erase-all');
    await plugin.stores.delete(`annotation-page-${page}`);
    const AnnotationStore = plugin.stores.create(`annotation-page-${page}`);
    setAnnStore(AnnotationStore)
  }

  // Erase
  const selectElement = (e: any) => {
      if (TOOL !== 'erase') return;
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

  // Shape
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
  const drawRect = (x: number, y: number) => {
      disableTracer();
      const {xS, yS} = getScale();
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('id', `${user.id}-${EL_COUNT}`);
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
      svg.current?.appendChild(rect);
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
    setActiveTool('cursor')
    elem.onblur =() => {
      pasteText();
    }
  }
  const expandTextArea = (xC: number, yC: number) => {
    const elem = document.getElementById('text-tool') as HTMLTextAreaElement;
    if (!doc.current) return;
    const xD = doc.current.clientWidth;
    const yD = doc.current.clientHeight;
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

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    text.onpointerenter = () => {
      selectElement(text);
    }
    text.setAttribute('x', (l + 6).toString());
    text.setAttribute('y', (t + 6).toString());
    text.setAttribute('width', w.toString());
    text.setAttribute('height', h.toString());
    text.setAttribute('id', `${user.id}-${EL_COUNT}`);

    EL_COUNT++;
    text.innerHTML = `<div style="width:${w}px; height:${h}px; color:${color(activeColor)}">${elem.value}</div>`;
    text.style.fontSize = '14px';
    text.style.fontFamily = 'Open Sans';
    svg.current?.appendChild(text);
    elem.style.display = 'none';
    if (!text?.outerHTML) return;
    updateAnnotations(text.outerHTML, text.id);
  }

  // update remote annotations
  useEffect(() => {
    plugin.addListener('remote-erase-all', () => {
      eraseAll(true);
    });
    return () => {
      plugin.removeListeners('remote-erase-all');
    }
  }, [])
  useEffect(() => {
    if (!annStore) return;   
    // subscribe to data changes
    annStore.subscribe('*', (a: any) => {
      const key = Object.keys(a)[0];
      const value = a[key];

      if (value) {
          // shape added
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.innerHTML = value;
          if (!svg.current) return;
          svg.current.appendChild(g);
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
      const data = annStore.getAll();
  
      if (!svg || !svg.current) return;
      svg.current.innerHTML = '';

      for (const id in data) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.innerHTML = data[id];
      svg.current.appendChild(g);
      const el = document.getElementById(id);
      el?.addEventListener('mousemove', () => {
          selectElement(el);
      })
      }
  }, [dimensions, annStore])

    return {
        onMouseDown,
        onTouchStart,
        onMouseMove,
        onTouchMove,
        onMouseUp,
        onTouchEnd,
        state,
        dimensions, setDimensions
    }
}

export default useAnnotation
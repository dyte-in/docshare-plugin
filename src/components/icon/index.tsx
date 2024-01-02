import './style.css';
import iconPack from './iconPack.json'
import { useEffect, useRef, useState } from 'react';

interface Props {
    icon: keyof typeof iconPack;
    className?: string;
    active?: boolean;
    onClick?: (...args: any) => void;
}

const Icon = (props: Props) => {
  const { icon, className, onClick, active } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    if (!ref.current) return;
    const cont = ref.current;
    if (!cont) return;
    const color = active ? 'black' : window.getComputedStyle(cont).color;
    setImgSrc(`data:image/svg+xml;utf8,${encodeURIComponent(iconPack[icon].replaceAll('currentColor', color))}`)

  }, [ref, active]);

  return (
    <div ref={ref} onClick={onClick} className={`icon-wrapper ${className}`}>
      <img src={imgSrc} />
    </div>
  )
}

export default Icon

Icon.defaultProps = {
  className: '',
  onClick: () => {},
  active: false,
}
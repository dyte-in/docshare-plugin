import './icon.css';
import iconPack from '../../icons/iconPack.json'
import { useEffect, useState } from 'react';

interface Props {
    icon: keyof typeof iconPack;
    className?: string;
    onClick?: (...args: any) => void;
}

const Icon = (props: Props) => {
  const { icon, className, onClick } = props;
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    const cont = document.getElementById('icon-cont');
    if (!cont) return;
    const color = window.getComputedStyle(cont).color;
    setImgSrc(`data:image/svg+xml;utf8,${encodeURIComponent(iconPack[icon].replaceAll('currentColor', color))}`)

  }, []);

  return (
    <div id='icon-cont' onClick={onClick} className={`icon-wrapper ${className}`}>
      <img src={imgSrc} />
    </div>
  )
}

export default Icon

Icon.defaultProps = {
  className: '',
  onClick: () => {},
}
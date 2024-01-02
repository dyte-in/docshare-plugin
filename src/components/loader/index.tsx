import { useEffect, useState } from 'react';
import './style.css'

const Loader = () => {
  const [val, setVal] = useState<number>(10);

  useEffect(() => {
    if (val > 85) return;
    setTimeout(() => {
      setVal((v) => v + 5);
    }, 600);
  }, [val])

  return (
    <div className='loader-container'>
      <div
        className='loader-indicator'
        style={{
          width: `${val}%`
        }}
      ></div>
    </div>
  )
}

export default Loader
import sticky from '../../assets/sticky.png';
import sticky2 from '../../assets/sticky2.png';
import { useState, useEffect, useCallback } from 'react';

function Sticky(): React.JSX.Element {
  const [moving, setMoving] = useState<boolean>(false);

  function fuck(): void {
    const data = 'FUCK';
    window.electron.ipcRenderer.send('create-note', data);
  }

  const animate = useCallback((): void => {
    const animateInterval = setInterval(() => {
      setStickyImg((prevImg) => (prevImg === sticky ? sticky2 : sticky));
      if (!moving) {
        clearInterval(animateInterval);
      }
    }, 100);
  }, [moving]);

  const [stickyImg, setStickyImg] = useState<string>(sticky);

  useEffect(() => {
    const handler = (_event, value): void => {
      if (value == null) {
        setMoving(false);
      } else {
        setMoving(true);
        animate();
      }
    };

    const unsubscribe = window.electron.ipcRenderer.on('move-event', handler);

    return () => {
      unsubscribe();
    };
  }, [animate]);

  return (
    <>
      <img
        src={stickyImg} // or use import if using Vite: import sticky from './assets/sticky.png'
        alt="sticky"
        className="w-32 h-32 object-contain select-none"
      />
      <button onClick={fuck}></button>
    </>
  );
}

export default Sticky;

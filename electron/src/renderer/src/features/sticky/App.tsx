import { useRef, useState, useEffect } from 'react';

import clippy from '../../assets/clippy.png';
import sticky_move_1 from '../../assets/sticky_move_1.png';
import sticky_move_2 from '../../assets/sticky_move_2.png';

function Sticky(): React.JSX.Element {
  function createNote(): void {
    const data = 'note data';
    window.electron.ipcRenderer.send('create-note', data);
  }

  const stickyStateRef = useRef<string | null>(null);

  const [stickyImg, setStickyImg] = useState<string>(clippy);

  useEffect(() => {
    const unsubscribeMove = window.electron.ipcRenderer.on('sticky-move', (_event, moveType) => {
      stickyStateRef.current = moveType;

      if (moveType === null) {
        setStickyImg(clippy);
      } else {
        const linearInterval = setInterval(() => {
          if (stickyStateRef.current === null) {
            clearInterval(linearInterval);
          } else {
            setStickyImg((prevImg) => {
              if (stickyStateRef.current === 'linear') {
                return prevImg !== sticky_move_1 ? sticky_move_1 : sticky_move_2;
              }
              // To add more move types images here
              return prevImg;
            });
          }
        }, 100);
      }
    });

    return () => {
      unsubscribeMove();
    };
  }, []);

  return (
    <div className="m-0 w-full min-h-screen flex justify-center items-center bg-transparent">
      <img src={stickyImg} alt="sticky" className="w-50 h-50" />

      <button onClick={createNote} className="text-white">
        Create Note
      </button>
    </div>
  );
}

export default Sticky;

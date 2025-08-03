import { useRef, useState, useEffect } from 'react';

import sticky_confused from '../../assets/sticky_confused.png';
import sticky_mischevious from '../../assets/sticky_mischevious.png';
import sticky_sleepy from '../../assets/sticky_sleepy.png';
import sticky_move_backslash_1 from '../../assets/sticky_move_backslash_1.png';
import sticky_move_backslash_2 from '../../assets/sticky_move_backslash_2.png';
import sticky_move_slash_1 from '../../assets/sticky_move_slash_1.png';
import sticky_move_slash_2 from '../../assets/sticky_move_slash_2.png';
import sticky_move_downright_1 from '../../assets/sticky_downright_1.png';
import sticky_move_downright_2 from '../../assets/sticky_downright_2.png';
import sticky_tp_1 from '../../assets/sticky_tp_1.png';
import sticky_tp_2 from '../../assets/sticky_tp_2.png';
import sticky_tp_3 from '../../assets/sticky_tp_3.png';

function Sticky(): React.JSX.Element {
  const stickyStateRef = useRef<string | null>(null);

  const [stickyImg, setStickyImg] = useState<string>(sticky_sleepy);

  useEffect(() => {
    const unsubscribeMove = window.electron.ipcRenderer.on('sticky-move', (_event, moveData) => {
      stickyStateRef.current = moveData.type;

      if (moveData.type === null) {
        const images = [sticky_sleepy, sticky_mischevious, sticky_confused];
        const randomImg = images[Math.floor(Math.random() * images.length)];
        setStickyImg(randomImg);
      } else {
        if (moveData.type === 'tp') {
          const sticky_tp_imgs = [sticky_tp_1, sticky_tp_2, sticky_tp_3];

          let i = sticky_tp_imgs.length - 1;
          const tpInterval = setInterval(() => {
            setStickyImg(sticky_tp_imgs[i]);
            i--;
            if (i < 0) {
              clearInterval(tpInterval);
              setTimeout(() => {
                setStickyImg(sticky_sleepy);
              });
            }
          }, 500);
          return;
        }

        const linearInterval = setInterval(() => {
          if (stickyStateRef.current === null) {
            clearInterval(linearInterval);
          } else {
            setStickyImg((prevImg) => {
              if (
                stickyStateRef.current !== null &&
                ['linear', 'jerk', 'cursor'].includes(stickyStateRef.current)
              ) {
                const images =
                  moveData.direction === 'slash'
                    ? [sticky_move_slash_1, sticky_move_slash_2]
                    : moveData.direction === 'backslash'
                      ? [sticky_move_backslash_1, sticky_move_backslash_2]
                      : moveData.direction === 'rightdown'
                        ? [sticky_move_downright_1, sticky_move_downright_2]
                        : [prevImg, prevImg];
                return prevImg === images[0] ? images[1] : images[0];
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
    <div className="m-0 w-full min-h-screen flex flex-col justify-center items-center bg-transparent">
      <img src={stickyImg} alt="sticky" draggable={false} className="w-50 h-50" />
    </div>
  );
}

export default Sticky;

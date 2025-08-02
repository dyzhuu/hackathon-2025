import { BrowserWindow, screen } from 'electron';
import { mouse, Point, straightTo } from '@nut-tree-fork/nut-js';

const velocity = 1000;
const jork = 30;

const distance = ([x1, y1]: [number, number], [x2, y2]: [number, number]): number =>
  Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));

export const moveTo = async (
  sticky: BrowserWindow,
  x: number,
  y: number,
  type: 'jerk' | 'linear' = 'jerk'
): Promise<void> => {
  let then = Date.now();

  let stickyPos: [number, number];

  // console.log((stickyPos = sticky.getPosition() as [number, number]), distance(stickyPos, [x, y]));
  while (
    ((stickyPos = sticky.getPosition() as [number, number]), distance(stickyPos, [x, y]) > 10)
  ) {
    let [cx, cy] = stickyPos;
    const now = Date.now();
    const delta = now - then;

    cx += Math.floor(velocity * (delta / 1000) * Math.sign(x - cx));
    cy += Math.floor(velocity * (delta / 1000) * Math.sign(y - cy));

    if (type === 'jerk') {
      cx += Math.floor(Math.random() * jork) * Math.sign(Math.random() - 0.5);
      cy += Math.floor(Math.random() * jork) * Math.sign(Math.random() - 0.5);
    }

    sticky.setPosition(cx, cy);
    const cursorPos = screen.getCursorScreenPoint();
    if (Math.abs(cursorPos.x - cx - 64) < 64 && Math.abs(cursorPos.y - cy - 64) < 64) {
      await mouse.setPosition(new Point(cx + 64, cy + 64));
    }
    then = now;

    await new Promise((res) => setTimeout(res, 1_000 / 60));
  }
};

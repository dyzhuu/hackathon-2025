import { BrowserWindow, screen } from 'electron';
import { mouse, Point } from '@nut-tree-fork/nut-js';

const STEP_RANGE = [50, 200];

export function randomLocation(range: [number, number]): number[] {
  const position = [Math.round(Math.random() * range[0]), Math.round(Math.random() * range[1])];
  return position;
}

export async function moveLinear(window: BrowserWindow, endX: number, endY: number): Promise<void> {
  const moveInterval = 1000 / 30; // 30 Steps per second
  const steps = Math.round(Math.random() * STEP_RANGE[1]) + STEP_RANGE[0];

  const start = window.getPosition();
  const stepSizeX = (endX - start[0]) / steps;
  const stepSizeY = (endY - start[1]) / steps;
  const xDir = Math.sign(stepSizeX);
  const yDir = Math.sign(stepSizeY);

  return new Promise((resolve) => {
    const moveIntervalId = setInterval(() => {
      const currentPosition = window.getPosition();

      const newX = Math.round(currentPosition[0] + stepSizeX);
      const newY = Math.round(currentPosition[1] + stepSizeY);

      if (
        (xDir === 1 && newX >= endX) ||
        (xDir === -1 && newX <= endX) ||
        (yDir === 1 && newY >= endY) ||
        (yDir === -1 && newY <= endY)
      ) {
        window.setPosition(Math.round(endX), Math.round(endY));
        clearInterval(moveIntervalId);
        resolve();
      } else {
        window.setPosition(newX, newY);
      }
    }, moveInterval);
  });
}

export async function moveJerk(window: BrowserWindow, x: number, y: number): Promise<void> {
  const velocity = 1000;
  const jork = 30;

  const distance = ([x1, y1]: [number, number], [x2, y2]: [number, number]): number =>
    Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));

  let then = Date.now();

  let stickyPos: [number, number];

  console.log((stickyPos = window.getPosition() as [number, number]), distance(stickyPos, [x, y]));
  while (
    ((stickyPos = window.getPosition() as [number, number]), distance(stickyPos, [x, y]) > 10)
  ) {
    let [cx, cy] = stickyPos;
    const now = Date.now();
    const delta = now - then;

    cx += Math.floor(velocity * (delta / 1000) * Math.sign(x - cx));
    cy += Math.floor(velocity * (delta / 1000) * Math.sign(y - cy));

    // Random jerk effect
    cx += Math.floor(Math.random() * jork) * Math.sign(Math.random() - 0.5);
    cy += Math.floor(Math.random() * jork) * Math.sign(Math.random() - 0.5);

    try {
      window.setPosition(cx, cy);
    } catch (ex) {
      console.error(ex);
      return;
    }

    then = now;

    await new Promise((res) => setTimeout(res, 1_000 / 60));
  }
}

export async function moveCursor(sticky: BrowserWindow, x: number, y: number): Promise<void> {
  const velocity = 1000;
  const jork = 30;

  const distance = ([x1, y1]: [number, number], [x2, y2]: [number, number]): number =>
    Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));

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

    // Randomly apply jerk effect with 50% chance
    if (Math.random() < 0.5) {
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
}

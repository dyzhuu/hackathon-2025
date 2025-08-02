import { BrowserWindow } from 'electron';

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

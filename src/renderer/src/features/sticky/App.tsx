import clippiy from '../../assets/clippy.png';

function sticky(): React.JSX.Element {
  function fuck(): void {
    const data = 'FUCK';
    window.electron.ipcRenderer.send('some-channel', data);
  }

  return (
    <>
      <img
        src={clippiy} // or use import if using Vite: import sticky from './assets/sticky.png'
        alt="sticky"
        className="w-32 h-32 object-contain"
      />
      <button onClick={fuck}></button>
    </>
  );
}

export default sticky;

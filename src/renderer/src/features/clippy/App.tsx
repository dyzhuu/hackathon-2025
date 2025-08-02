import clippiy from '../../assets/clippy.png';

function clippy(): React.JSX.Element {
  function fuck(): void {
    const data = 'FUCK';
    window.electron.ipcRenderer.send('some-channel', data);
  }

  return (
    <>
      <img
        src={clippiy} // or use import if using Vite: import clippy from './assets/clippy.png'
        alt="clippy"
        className="w-32 h-32 object-contain"
      />
      <button onClick={fuck}>fuck</button>
    </>
  );
}

export default clippy;

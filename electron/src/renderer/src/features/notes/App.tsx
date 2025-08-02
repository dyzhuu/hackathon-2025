import { useEffect, useState } from 'react';

function Notes(): React.JSX.Element {
  const [message, setMessage] = useState<string>('');
  useEffect(() => {
    const handler = (_event, data) => {
      setMessage(data);
    };

    window.electron.ipcRenderer.on('note-data', handler);

    // Tell the main process you're ready
    // window.electron.ipcRenderer.send('note-ready');

    return () => {
      window.electron.ipcRenderer.removeListener('note-data', handler);
    };
  }, []);

  return (
    <div className="w-full min-h-screen flex justify-center items-center bg-yellow-200">
      <h1 className="text-3xl text-white font-bold">{message}</h1>
    </div>
  );
}

export default Notes;

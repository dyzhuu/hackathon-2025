import { useEffect, useState } from 'react';

function Notes(): React.JSX.Element {
  const [message, setMessage] = useState<string>('');
  useEffect(() => {
    const unsubscribeData = window.electron.ipcRenderer.on('note-data', (_event, data) => {
      setMessage(data);
    });

    // Tell the main process you're ready
    window.electron.ipcRenderer.send('note-ready');

    return () => {
      unsubscribeData();
    };
  }, []);

  return (
    <div className="w-[150px] h-screen flex justify-center bg-yellow-200">
      <h1 className="p-2 text-l text-gray-800 font-bold">{message ?? 'Notes'}</h1>
    </div>
  );
}

export default Notes;

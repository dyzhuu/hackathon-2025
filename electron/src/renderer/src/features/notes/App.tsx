import { useEffect, useState } from 'react';

function Notes(): React.JSX.Element {
  const [message, setMessage] = useState<string>('');
  useEffect(() => {
    window.electron.ipcRenderer.on('note-data', (event, data) => {
      setMessage(data);
    });
  }, []);

  return (
    <div className="w-full min-h-screen flex justify-center items-center bg-yellow-200">
      <h1 className="text-3xl text-white font-bold">{message}</h1>
    </div>
  );
}

export default Notes;

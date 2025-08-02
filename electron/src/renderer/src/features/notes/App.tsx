import { useEffect, useState } from 'react';

function Notes(): React.JSX.Element {
  const [message, setMessage] = useState<string>('');
  useEffect(() => {
    window.electron.ipcRenderer.on('note-data', (event, data) => {
      setMessage(data);
    });
  }, []);

  return (
    <>
      <h1 className="text-blue-500">{message}</h1>
    </>
  );
}

export default Notes;

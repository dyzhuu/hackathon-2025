import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import sticky from './features/sticky/App';
import notes from './features/notes/App';
import { useEffect } from 'react';

export default function App(): React.ReactElement {
  useEffect(() => {
    (async () => {
      const platform = await window.api.getPlatform();
      console.log(platform, typeof platform);
    })();
  }, []);
  return (
    <Router>
      <Routes>
        <Route path="/" element={sticky()} />
        <Route path="/notes" element={notes()} />
      </Routes>
    </Router>
  );
}

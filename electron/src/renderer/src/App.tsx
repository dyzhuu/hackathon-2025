import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sticky from './features/sticky/App';
import Notes from './features/notes/App';
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
        <Route path="/sticky" element={Sticky()} />
        <Route path="/notes" element={Notes()} />
      </Routes>
    </Router>
  );
}

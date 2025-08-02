import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import clippy from './features/sticky/App'
import notes from './features/notes/App'

export default function App(): React.ReactElement {
  return (
    <Router>
      <Routes>
        <Route path="/" element={clippy()} />
        <Route path="/notes" element={notes()} />
      </Routes>
    </Router>
  )
}

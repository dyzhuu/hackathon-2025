import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <h1 className="text-blue-500">I'm gay dabudibadubai</h1>
      <Versions></Versions>
    </>
  )
}

export default App

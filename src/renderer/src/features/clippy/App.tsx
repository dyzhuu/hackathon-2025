function clippy(): React.JSX.Element {
  function fuck(): void{
    const data = "FUCK"
    window.electron.ipcRenderer.send("some-channel", data)
  }

  return (
    <>
      <h1 className="text-blue-500">clippy</h1>
      <button onClick={fuck}>fuck</button>
    </>
  )
}

export default clippy

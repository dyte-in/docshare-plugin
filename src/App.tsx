import './index.css'
import { useContext } from 'react'
import { MainContext } from './context'
import Loading from './pages/loading';
import Dashboard from './pages/dashboard';
import DocViewer from './pages/viewers';

const App = () => {
  const { plugin, doc } = useContext(MainContext);

  if (!plugin) return <Loading />;
  if (doc) return <DocViewer />;
  return <Dashboard />;
}

export default App
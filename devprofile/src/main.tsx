import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import './index.css'
import App from './App'

/*
  Provider оборачивает всё приложение и даёт доступ к Redux store.
  Без него useSelector и useDispatch не работают ни в одном компоненте.
*/
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
)
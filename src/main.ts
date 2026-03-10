import './style.css'
import { mountApp } from './app/App'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('Root element #app was not found.')
}

mountApp(root)

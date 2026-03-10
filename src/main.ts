import './style.css'
import { App } from './app/App.ts'

const app = new App(document.querySelector<HTMLDivElement>('#app')!)
app.start()

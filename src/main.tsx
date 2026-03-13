import "monaco-editor/esm/nls.messages.zh-cn.js";
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // 同级目录
import "./monaco-worker";

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root container missing in index.html')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

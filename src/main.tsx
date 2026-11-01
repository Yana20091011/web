import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DesktopPet from './DesktopPet';
import '@fontsource-variable/nunito-sans';
import './styles.css';
import './desktop.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
async function start() {
  const desktopState = await window.keycritter?.getState();
  const companion = Boolean(desktopState && location.hash === '#companion');
  if (companion) document.documentElement.dataset.surface = 'companion';
  root.render(
    <React.StrictMode>
      {companion ? <DesktopPet initial={desktopState!} /> : <App desktopState={desktopState} />}
    </React.StrictMode>,
  );
}
start().catch(() =>
  root.render(
    <p role="alert">
      KeyCritter could not connect to the desktop app. Please close and reopen it.
    </p>,
  ),
);

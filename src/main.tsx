import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DesktopPet from './DesktopPet';
import '@fontsource-variable/nunito-sans';
import './styles.css';
import './desktop.css';
import './studio.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
async function start() {
  const desktopState = await window.keycritter?.getState();
  document.title = `KeyCritter v${__APP_VERSION__} — Your tiny typing companion`;
  if (desktopState?.version && desktopState.version !== __APP_VERSION__) {
    root.render(
      <p role="alert">
        The app and interface versions do not match. Quit KeyCritter completely and reopen the
        executable from the latest extracted download.
      </p>,
    );
    return;
  }
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

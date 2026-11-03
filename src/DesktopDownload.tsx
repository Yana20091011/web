import { Download, Monitor } from 'lucide-react';
import './desktop-download.css';

export const WINDOWS_DOWNLOAD_URL =
  'https://github.com/Yana20091011/web/releases/latest/download/KeyCritter-Windows.exe';

export default function DesktopDownload() {
  return (
    <section className="desktop-download" aria-labelledby="desktop-download-title">
      <div className="desktop-download-copy">
        <Monitor size={22} aria-hidden="true" />
        <div>
          <h2 id="desktop-download-title">A little company, on your desktop.</h2>
          <p>Keep your pet above your apps and let it react while you type.</p>
        </div>
      </div>
      <div className="desktop-download-actions">
        <a className="button primary" href={WINDOWS_DOWNLOAD_URL}>
          <Download size={17} aria-hidden="true" />
          Download for Windows
        </a>
        <span>Windows 10/11 · 64-bit · No account needed</span>
      </div>
      <details className="desktop-download-help">
        <summary>How to use the desktop pet</summary>
        <ol>
          <li>
            Download and open <strong>KeyCritter-Windows.exe</strong>. No installer is needed.
          </li>
          <li>
            Choose a character in <strong>My Pets → Character library</strong>.
          </li>
          <li>
            Click <strong>Enable keyboard reactions</strong>, then close the designer to keep your
            floating pet.
          </li>
        </ol>
        <p>
          Drag the pet’s name bar to move it. Use the KeyCritter tray menu to reopen the designer or
          quit.
        </p>
        <p>
          The app is unsigned, so Windows may show a security warning. Only open a download you
          trust. Browser-saved pets stay in your browser; choose your pet again in the desktop app.
        </p>
        <a
          href="https://github.com/Yana20091011/web/releases/latest"
          target="_blank"
          rel="noreferrer"
        >
          Release notes, ZIP download, and checksums
        </a>
      </details>
    </section>
  );
}

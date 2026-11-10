import { useMemo, useState } from 'react';
import { downloadPetFile } from './downloadPetFile';
import { exportPetFile, type PortablePet } from './petTransferFormat';
import { Download, Monitor, Play } from 'lucide-react';
import './desktop-download.css';

export const WINDOWS_DOWNLOAD_URL =
  'https://github.com/Yana20091011/web/releases/latest/download/KeyCritter-Windows.exe';

export default function DesktopDownload({
  pet,
  onUseBrowser,
}: {
  pet: PortablePet;
  onUseBrowser: () => void;
}) {
  const [isMac] = useState(() => /^Mac/.test(navigator.platform) && navigator.maxTouchPoints < 2);
  const [savedPet, setSavedPet] = useState<PortablePet | null>(null);
  const [error, setError] = useState('');
  const exportedCurrent = useMemo(() => {
    if (!savedPet) return false;
    if (savedPet.design === pet.design && savedPet.reactions === pet.reactions) return true;
    try {
      return exportPetFile(savedPet) === exportPetFile(pet);
    } catch {
      return false;
    }
  }, [savedPet, pet.design, pet.reactions]);
  function saveForDesktop() {
    setError('');
    try {
      downloadPetFile(pet);
      setSavedPet(pet);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this pet file.');
    }
  }
  return (
    <section className="desktop-download" aria-labelledby="desktop-download-title">
      <div className="desktop-download-copy">
        <Monitor size={22} aria-hidden="true" />
        <div>
          <h2 id="desktop-download-title">
            {isMac ? 'A little company, on your MacBook.' : 'A little company, on your desktop.'}
          </h2>
          <p>
            {isMac
              ? 'Create your pet in Safari or Chrome and let it react while you type here.'
              : 'Keep your pet above your apps and let it react while you type.'}
          </p>
        </div>
      </div>
      <div className="desktop-download-actions">
        <button type="button" className="button preview-button" onClick={saveForDesktop}>
          <Download size={17} aria-hidden="true" />
          {isMac ? 'Save a pet backup' : 'Save my pet for desktop'}
        </button>
        {isMac ? (
          <>
            <button type="button" className="button primary" onClick={onUseBrowser}>
              <Play size={17} aria-hidden="true" />
              Start typing in this browser
            </button>
            <span>Works in Safari and Chrome · No download needed</span>
          </>
        ) : (
          <>
            <a className="button primary" href={WINDOWS_DOWNLOAD_URL}>
              <Download size={17} aria-hidden="true" />
              Download for Windows
            </a>
            <span>Windows 10/11 · 64-bit · No account needed</span>
          </>
        )}
      </div>
      <div className="desktop-transfer-steps">
        {isMac ? (
          <p>
            Customize your character, background, blink frames, and key reactions right here.
            Reactions work while you type in the playground. Use <strong>Save pet</strong> to keep
            your friend in My Pets, or save a backup and choose <strong>Import pet</strong>
            in another browser. The floating desktop app is currently for Windows.
          </p>
        ) : (
          <>
            <p>
              <strong>Keep your website changes:</strong> save your pet file above, then open the
              desktop app and choose <strong>Import website pet</strong>.
            </p>
            <p>
              Your character, uploaded background, animations, and key reactions are included.
              Downloading the app alone does not copy your website settings.
            </p>
          </>
        )}
        {savedPet && (
          <p role="status" className="desktop-transfer-status">
            {exportedCurrent
              ? isMac
                ? 'Pet backup ready. Use Import pet to open it in another browser.'
                : 'Pet file ready. Import the .keycritter.json file in the desktop app.'
              : 'Your pet has changed. Save a new pet file to transfer your latest changes.'}
          </p>
        )}
        {error && (
          <p role="alert" className="desktop-transfer-error">
            {error}
          </p>
        )}
      </div>
      {!isMac && (
        <details className="desktop-download-help">
          <summary>How to use the desktop pet</summary>
          <ol>
            <li>
              Download and open <strong>KeyCritter-Windows.exe</strong>. No installer is needed.
            </li>
            <li>
              Click <strong>Import website pet</strong> and select the{' '}
              <strong>.keycritter.json</strong> file you saved here. You can also choose a new
              character in My Pets.
            </li>
            <li>
              Click <strong>Enable keyboard reactions</strong>, then close the designer to keep your
              floating pet.
            </li>
          </ol>
          <p>
            Drag the pet’s name bar to move it. Use the KeyCritter tray menu to reopen the designer
            or quit.
          </p>
          <p>
            The app is unsigned, so Windows may show a security warning. Only open a download you
            trust. To transfer a website pet, choose Export pet here, then Import pet in the latest
            desktop app.
          </p>
          <a
            href="https://github.com/Yana20091011/web/releases/latest"
            target="_blank"
            rel="noreferrer"
          >
            Release notes, ZIP download, and checksums
          </a>
        </details>
      )}
    </section>
  );
}

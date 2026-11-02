import eyesOpen from './assets/laptop-buddy/eyes-open.png?inline';
import eyesHalfClosed from './assets/laptop-buddy/eyes-half-closed.png?inline';
import eyesClosed from './assets/laptop-buddy/eyes-closed.png?inline';

// Inline the original artwork so presets work offline, including the standalone HTML export.
// Applying a preset uses the same local image preparation as uploaded animation frames.
export const LAPTOP_BUDDY = {
  expressions: [
    { label: 'Open', image: eyesOpen },
    { label: 'Half-closed', image: eyesHalfClosed },
    { label: 'Closed', image: eyesClosed },
  ],
  sequence: [
    { expression: 0, duration: 100 },
    { expression: 1, duration: 120 },
    { expression: 2, duration: 400 },
    { expression: 1, duration: 120 },
  ],
  pauseMs: 3000,
};

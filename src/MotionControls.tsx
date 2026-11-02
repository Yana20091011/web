import type { PetDesign } from './Pet';

export default function MotionControls({
  design,
  onChange,
}: {
  design: PetDesign;
  onChange: (strength: number) => void;
}) {
  const strength = design.motionStrength ?? 100;
  return (
    <section className="motion-settings" aria-label="Movement settings">
      <div className="motion-settings-title">
        <label htmlFor="motion-strength">Movement strength</label>
        <div>
          <output htmlFor="motion-strength">{strength}%</output>
          <button onClick={() => onChange(100)} aria-label="Reset movement strength">
            Reset
          </button>
        </div>
      </div>
      <input
        id="motion-strength"
        type="range"
        min={0}
        max={100}
        step={5}
        value={strength}
        aria-valuetext={strength === 0 ? '0 percent, still' : `${strength} percent`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="motion-scale-labels">
        <span>Still</span>
        <span>Full movement</span>
      </div>
      <p>
        Controls shaking, bouncing, and idle movement. At 0%, your image frames and expressions
        still play.
      </p>
    </section>
  );
}

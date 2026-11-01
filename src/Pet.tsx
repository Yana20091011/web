export type Species = 'cat' | 'bunny' | 'blob' | 'custom';
export type Accessory = 'bow' | 'glasses' | 'star' | 'none';
export type Action = 'jump' | 'cheer' | 'surprise' | 'dance' | 'sleep';
export type PetPose = 'idle' | Action;
export type PetImages = Partial<Record<PetPose, string>>;

export interface PetDesign {
  name: string;
  species: Species;
  color: string;
  size: number;
  accessory: Accessory;
  images?: PetImages;
}

export default function Pet({
  design,
  action,
  mini = false,
}: {
  design: PetDesign;
  action?: Action;
  mini?: boolean;
}) {
  const { species, color, accessory } = design;
  if (species === 'custom' && design.images?.idle) {
    return (
      <img
        className={`pixel-pet custom-pet ${mini ? 'mini-pet' : ''}`}
        src={(action && design.images[action]) || design.images.idle}
        alt=""
        draggable={false}
        data-pose={action && design.images[action] ? action : 'idle'}
      />
    );
  }
  return (
    <svg
      className={`pixel-pet ${mini ? 'mini-pet' : ''}`}
      viewBox="0 0 72 76"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ '--pet-color': color } as React.CSSProperties}
    >
      <g className="pet-body">
        {species === 'cat' && (
          <>
            <path
              className="pet-tail"
              d="M51 55h8v-5h5v-9h-4v-5h6v3h4v14h-4v8H55v5H45V55z"
              fill={color}
              stroke="#40374d"
              strokeWidth="2"
            />
            <path
              d="M18 43h35v6h5v12h-5v7h-5v2H38v-3h-5v3H22v-2h-5v-7h-5V51h6z"
              fill={color}
              stroke="#40374d"
              strokeWidth="2"
            />
            <path
              d="M12 35V15h5V7h5v5h5v6h18v-6h5V7h5v8h5v20h4v12h-5v7H13v-7H8V35z"
              fill={color}
              stroke="#40374d"
              strokeWidth="2"
            />
            <path d="M17 25V15h5v5h5v5zm30 0v-5h5v-5h3v10z" fill="#f7c3cf" />
            <path d="M29 19h5v8h-5zm10 0h5v8h-5z" fill="var(--pet-shade)" />
            <path d="M23 47h26v9h-5v8H28v-8h-5z" fill="#fff7df" />
            <path d="M18 54h6v8h-6zm29 0h6v8h-6z" fill="var(--pet-shade)" />
            <path d="M21 63h9v6h-8v-2h-1zm20 0h9v4h-2v2h-7z" fill="#fff7df" />
            <path d="M25 65v3m21-3v3" stroke="#e4d5c0" strokeWidth="1.5" />
            <path d="M9 42h8v3H9zm47 0h8v3h-8z" fill="var(--pet-shade)" />
          </>
        )}
        {species === 'bunny' && (
          <>
            <path
              d="M22 35V8h4V3h7v5h3v24h6V8h3V3h7v5h4v30h5v20h-5v9H18v-9h-5V39h5v-4z"
              fill={color}
              stroke="#40374d"
              strokeWidth="2"
            />
            <path d="M27 10h5v19h-5zm19 0h5v19h-5z" fill="#f5bdcb" />
            <path d="M25 49h24v14H25zM18 62h12v7H16v-4h2zm26 0h12v3h2v4H44z" fill="#fff7df" />
          </>
        )}
        {species === 'blob' && (
          <>
            <path
              d="M25 23h23v4h8v6h5v8h4v17h-5v7H13v-7H8V44h5v-9h5v-7h7z"
              fill={color}
              stroke="#40374d"
              strokeWidth="2"
            />
            <path d="M16 53h9v5h24v-5h9v8H16z" fill="var(--pet-shade)" />
            <path d="M24 29h10v4H24zm-5 6h5v5h-5z" fill="#fff7df" opacity=".8" />
          </>
        )}
        <g className={action === 'sleep' ? 'sleepy-face' : 'pet-face'}>
          {action === 'surprise' ? (
            <>
              <path d="M23 34h6v8h-6zm22 0h6v8h-6z" fill="#40374d" />
              <path d="M33 44h8v7h-8z" fill="#40374d" />
              <path d="M35 45h4v3h-4z" fill="#ef8fae" />
            </>
          ) : action === 'sleep' ? (
            <path d="M22 39h9v3h-9zm21 0h9v3h-9zM34 46h6v3h-6z" fill="#40374d" />
          ) : (
            <>
              <g className="pet-eyes">
                <path
                  d="M22 39v-4h3v-3h3v3h3v4h-3v-3h-3v3zm21 0v-4h3v-3h3v3h3v4h-3v-3h-3v3z"
                  fill="#40374d"
                />
              </g>
              <path d="M30 43h14v5h-3v4h-8v-4h-3z" fill="#40374d" />
              <path d="M34 47h6v4h-6z" fill="#ed93ad" />
              <path d="M33 43h8v2h-8z" fill="#fff8e9" />
            </>
          )}
          <path d="M17 40h7v4h-7zm34 0h7v4h-7z" fill="#f49eaf" opacity=".8" />
        </g>
        {accessory === 'bow' && (
          <g stroke="#674466" strokeWidth="1.5">
            <path d="M26 53v10h4l7-4 7 4h4V53h-4l-7 4-7-4z" fill="#ee9dc5" />
            <path d="M34 56h6v5h-6z" fill="#f8c7de" />
          </g>
        )}
        {accessory === 'glasses' && (
          <g stroke="#40374d" strokeWidth="2">
            <path d="M18 32h15v12H20v-3h-2zm24 0h15v9h-2v3H42z" fill="#fff" fillOpacity=".3" />
            <path d="M33 36h9M14 34h4m39 0h5" />
          </g>
        )}
        {accessory === 'star' && (
          <path
            d="m55 17 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"
            fill="#f8d779"
            stroke="#8b6e49"
            strokeWidth="1.5"
          />
        )}
      </g>
    </svg>
  );
}

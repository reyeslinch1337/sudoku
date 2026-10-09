// Minimal stroke icons; 24x24 viewBox, colored by currentColor.

const Svg = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" class="icon">
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const IconMenu = () => <Svg d="M4 7h16M4 12h16M4 17h16" />;
export const IconPause = () => <Svg d="M9 6v12M15 6v12" />;
export const IconUndo = () => <Svg d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />;
export const IconRedo = () => <Svg d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />;
export const IconErase = () => <Svg d="M20 20H9L4 15l9-9 7 7-5 5M9 11l6 6" />;
export const IconPencil = () => <Svg d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" />;
export const IconAuto = () => <Svg d="M4 20 14 10M15 4v3M18.5 5.5l-2 2M20 9h-3M12 6.5l1.5 1.5" />;
export const IconCheck = () => <Svg d="m5 12 5 5L20 7" />;
export const IconHint = () => (
  <Svg d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />
);

import React from 'react';

const PATHS = {
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  lines: <path d="M5 7h14M5 12h14M5 17h9" />,
  check: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  dots: <><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></>,
  chevDown: <path d="m7 10 5 5 5-5" />,
  chevLeft: <path d="m14 6-6 6 6 6" />,
  chevRight: <path d="m10 6 6 6-6 6" />,
  calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  archive: <><rect x="3.5" y="4.5" width="17" height="4" rx="1" /><path d="M5.5 8.5v9.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5M10 12.5h4" /></>,
  download: <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14" />,
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />,
  bullets: <><circle cx="5.5" cy="7" r="1.2" /><circle cx="5.5" cy="12" r="1.2" /><circle cx="5.5" cy="17" r="1.2" /><path d="M10 7h9M10 12h9M10 17h9" /></>,
  numbers: <path d="M4.5 5.5h1.5v4M4.5 9.5h3M4 14.5a1.5 1.5 0 0 1 3 .5c0 1-3 2-3 3.5h3M10 7h9M10 12h9M10 17h9" />,
  checklist: <><rect x="3.5" y="5" width="5" height="5" rx="1" /><path d="m4.8 15.5 1.5 1.5 2.5-3M11.5 7.5h8M11.5 15.5h8" /></>,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
  sliders: <path d="M6 4v16M12 4v16M18 4v16M3.5 8.5h5M9.5 15.5h5M15.5 10.5h5" />,
  logout: <path d="M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4" />,
  restore: <path d="M5 12a7 7 0 1 0 2.1-5M5 4.5V8h3.5" />,
  move: <path d="M5 12h14m-4-4 4 4-4 4" />,
};

export function Icon({ name, size = 16 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

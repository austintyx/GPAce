// Minimal inline SVG icon set — no external icon dependency required.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export const DashboardIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="5.5" rx="1.6" />
    <rect x="13.5" y="12.5" width="7" height="8" rx="1.6" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.6" />
  </svg>
);

export const PlannerIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="4.5" width="17" height="16" rx="2.2" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3v3M16 3v3" />
    <path d="M7.5 13.2h3M13.5 13.2h3M7.5 16.7h3M13.5 16.7h3" />
  </svg>
);

export const TargetIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const UserIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8.2" r="3.6" />
    <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
  </svg>
);

export const LogoutIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M9 4.5H6a1.6 1.6 0 0 0-1.6 1.6v11.8A1.6 1.6 0 0 0 6 19.5h3" />
    <path d="M14.5 16 19 12l-4.5-4" />
    <path d="M19 12H9.2" />
  </svg>
);

export const MenuIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </svg>
);

export const CloseIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
  </svg>
);

export const EyeIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

export const EyeOffIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3.5 3.5l17 17" />
    <path d="M10.6 5.7c.45-.1.9-.15 1.4-.15 6 0 9.5 6.5 9.5 6.5a15.2 15.2 0 0 1-3.4 4.1M6.7 6.7C4.4 8.2 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.1 0 2.1-.2 3-.55" />
    <path d="M9.9 10.1a2.8 2.8 0 0 0 3.95 3.95" />
  </svg>
);

export const ArrowRightIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4.5 12h15" />
    <path d="M13 5.5 19.5 12 13 18.5" />
  </svg>
);

export const UploadIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 15.5V4.5" />
    <path d="M7.5 9 12 4.5 16.5 9" />
    <path d="M4.5 15.5v3a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-3" />
  </svg>
);

export const CalculatorIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="5" y="3" width="14" height="18" rx="2.2" />
    <path d="M8 7h8" />
    <path d="M8 11.2h.01M12 11.2h.01M16 11.2h.01M8 14.8h.01M12 14.8h.01M16 14.8h.01M8 18.4h.01M12 18.4h.01M16 18.4h.01" strokeWidth="2.4" />
  </svg>
);

export const LayersIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3.5 20.5 8 12 12.5 3.5 8Z" />
    <path d="M3.5 12.5 12 17l8.5-4.5" />
    <path d="M3.5 16.5 12 21l8.5-4.5" />
  </svg>
);

export const SparkleIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7 10.4 12.2 5 10.6l5.4-1.6Z" />
    <path d="M19 4v3M17.5 5.5h3" />
  </svg>
);

export const CheckIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5 12.5 9.5 17 19 6.5" />
  </svg>
);

export const ChevronDownIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5.5 8.5 12 15l6.5-6.5" />
  </svg>
);

import React from 'react';

const icons = {
  user: <><circle cx="12" cy="8" r="3.5"/><path d="M5.5 19c.7-3.4 3-5.2 6.5-5.2s5.8 1.8 6.5 5.2"/></>,
  shield: <><path d="M12 3.5 19 6v5.2c0 4.2-2.7 7.6-7 9.3-4.3-1.7-7-5.1-7-9.3V6l7-2.5Z"/><path d="m9.2 12 1.8 1.8 3.9-4"/></>,
  users: <><circle cx="9" cy="8.5" r="3"/><path d="M3.8 18c.5-3 2.2-4.6 5.2-4.6s4.7 1.6 5.2 4.6M15 6.2a2.7 2.7 0 0 1 0 5.2M16 13.8c2.4.4 3.7 1.8 4.2 4.2"/></>,
  logout: <><path d="M10 5H5v14h5M14.5 8l4 4-4 4M8 12h10"/></>,
  operations: <><path d="M4 18V9M10 18V5M16 18v-7M22 18H2"/><path d="m3 7 5-3 6 5 7-5"/></>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,
  tachograph: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2M4.5 5.5l2 2M19.5 5.5l-2 2"/></>,
  success: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.7L16.5 9"/></>,
  warning: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 16.5h.01"/></>,
  timer: <><circle cx="12" cy="13" r="8"/><path d="M12 13V8M9 2h6M18 6l1.5-1.5"/></>,
  idea: <><path d="M8.5 15.5c-1.4-1.1-2.3-2.8-2.3-4.7a5.8 5.8 0 1 1 11.6 0c0 1.9-.9 3.6-2.3 4.7-.7.6-1 1.1-1.1 1.8H9.6c-.1-.7-.4-1.2-1.1-1.8Z"/><path d="M9.8 20h4.4"/></>,
};

export const iconNames = Object.freeze(Object.keys(icons));

export function Icon({ name, size = 20, title, className = '' }) {
  const body = icons[name];
  if (!body) throw new Error(`Icône inconnue : ${name}`);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
    >
      {title ? <title>{title}</title> : null}
      {body}
    </svg>
  );
}

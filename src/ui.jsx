import React from 'react'

const ICON_PATHS = {
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  more: <><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  wait: <path d="M6 3h12M6 21h12M7 3v3l5 6-5 6v3M17 3v3l-5 6 5 6v3" />,
  jump: <path d="M5 12h14M13 6l6 6-6 6" />,
  ship: <><path d="M3 12l6-3 9-1 3 4-3 4-9-1z" /><path d="M9 9l3-5 2 4M9 15l3 5 2-4" /></>,
  crew: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-6 7-6s6 2 7 6" /></>,
  cargo: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  log: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  repair: <path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" />,
  fuel: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  shield: <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />,
  target: <><circle cx="12" cy="12" r="7" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /></>,
  engine: <path d="M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z" />,
  bridge: <><circle cx="12" cy="12" r="8" /><path d="M12 4v4M12 16v4M4 12h4M16 12h4" /></>,
  recruit: <><circle cx="10" cy="8" r="3.5" /><path d="M3 20c1-4 4-6 7-6s6 2 7 6M19 8v6M16 11h6" /></>,
  trade: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  mine: <><path d="M4 20l8-8M14 4l6 6-3 3-6-6z" /><circle cx="6" cy="18" r="1" /></>,
  probe: <><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" /></>,
  relay: <><path d="M12 20V10" /><path d="M8 6a6 6 0 0 1 8 0M5 3a10 10 0 0 1 14 0" /><circle cx="12" cy="10" r="1.5" /></>,
  salvage: <path d="M4 8l6-4 4 3 6-1-2 7 2 5-7 2-5-3-4 1z" />,
  hail: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  attack: <path d="M12 4l9 16H3z" />,
  drone: <path d="M5 16l3-8 3 8M13 16l3-8 3 8" />,
  flee: <path d="M20 12H8M12 6l-6 6 6 6M4 4v16" />,
  auto: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4h-4" /></>,
  exit: <><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" /><path d="M10 9l3 3-3 3" /></>,
  station: <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
}

export function Icon({ name, size = 22, strokeWidth = 1.8, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICON_PATHS[name] || ICON_PATHS.info}
    </svg>
  )
}

const PRIMARY_TONES = {
  accent: 'bg-accent text-accent-ink',
  hostile: 'bg-hostile text-[#1a0508]',
  fuel: 'bg-fuel text-[#1a1003]',
  exit: 'bg-exit text-[#03140d]',
}

export function PrimaryButton({ children, onClick, disabled = false, tone = 'accent', className = '', ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[60px] items-center justify-center gap-2 rounded-[18px] px-5 font-display text-[17px] font-bold uppercase tracking-[0.14em] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-raised disabled:text-mute ${PRIMARY_TONES[tone] || PRIMARY_TONES.accent} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, disabled = false, className = '', tone = 'plain', ...rest }) {
  const toneClass = tone === 'fuel'
    ? 'text-fuel'
    : tone === 'hostile'
      ? 'text-hostile-soft'
      : tone === 'accent'
        ? 'text-accent'
        : 'text-ink'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[16px] bg-raised px-4 font-display text-[15px] font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${toneClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function IconButton({ icon, label, onClick, disabled = false, className = '', active = false, size = 44 }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{ width: size, height: size }}
      className={`flex flex-none items-center justify-center rounded-[14px] transition-transform active:scale-95 disabled:opacity-40 ${active ? 'bg-accent text-accent-ink' : 'bg-panel text-ink'} ${className}`}
    >
      <Icon name={icon} />
    </button>
  )
}

const METER_TONES = {
  ink: { bar: 'bg-ink', track: 'bg-ink/15', text: 'text-ink' },
  accent: { bar: 'bg-accent', track: 'bg-accent/20', text: 'text-accent' },
  fuel: { bar: 'bg-fuel', track: 'bg-fuel/20', text: 'text-fuel' },
  hostile: { bar: 'bg-hostile', track: 'bg-hostile/20', text: 'text-hostile-soft' },
}

export function Meter({ label, value, max, tone = 'ink', compact = false }) {
  const palette = METER_TONES[tone] || METER_TONES.ink
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[13px] text-mute">{label}</span>
      <span className={`font-num font-bold leading-none ${compact ? 'text-[20px]' : 'text-[26px]'} ${palette.text}`}>
        {Math.round(value)}<span className="text-[15px] text-mute">/{Math.round(max)}</span>
      </span>
      <span className={`h-1 overflow-hidden rounded-full ${palette.track}`}>
        <span className={`block h-full rounded-full ${palette.bar}`} style={{ width: `${ratio * 100}%` }} />
      </span>
    </div>
  )
}

export function Sheet({ open, title, subtitle, onClose, children, footer = null }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 h-full w-full cursor-default bg-black/55" onClick={onClose} />
      <div className="stl-sheet-in relative flex max-h-[86vh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-panel shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-start gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
            <h2 className="m-0 font-display text-[20px] font-semibold leading-tight">{title}</h2>
            {subtitle ? <div className="mt-1 text-[14px] text-mute">{subtitle}</div> : null}
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} className="mt-4 bg-raised" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? <div className="border-t border-line px-5 pb-5 pt-3">{footer}</div> : null}
      </div>
    </div>
  )
}

export function Tile({ icon, title, detail, onClick, disabled = false, tone = 'accent', note = null }) {
  const iconTone = tone === 'fuel' ? 'text-fuel' : tone === 'hostile' ? 'text-hostile-soft' : tone === 'exit' ? 'text-exit' : 'text-accent'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[124px] flex-col items-start justify-between gap-3 rounded-[22px] bg-raised p-4 text-left transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-transparent disabled:outline disabled:outline-1 disabled:outline-dashed disabled:outline-line"
    >
      <span className={disabled ? 'text-mute' : iconTone}><Icon name={icon} size={28} /></span>
      <span className="flex flex-col gap-1">
        <span className={`font-display text-[17px] font-semibold ${disabled ? 'text-mute' : 'text-ink'}`}>{title}</span>
        {detail ? <span className="text-[14px] text-soft">{detail}</span> : null}
        {note ? <span className="text-[13px] text-mute">{note}</span> : null}
      </span>
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-[22px] bg-panel ${className}`}>{children}</div>
}

export function Label({ children, className = '' }) {
  return <div className={`font-num text-[13px] font-semibold uppercase tracking-[0.16em] text-mute ${className}`}>{children}</div>
}

export function ShipSilhouette({ shipClass = 'Scout', accent = '#46E0FF', width = 250 }) {
  const height = width / 2
  if (shipClass === 'Cargo') {
    return (
      <svg width={width} height={height} viewBox="0 0 240 120" role="img" aria-label="Cargo hull">
        <rect x="30" y="38" width="150" height="44" rx="6" fill="#0F1C2E" stroke={accent} strokeWidth="1.6" />
        <rect x="54" y="30" width="28" height="60" rx="3" fill="#0F1C2E" stroke="#FFB443" strokeWidth="1.4" />
        <rect x="90" y="30" width="28" height="60" rx="3" fill="#0F1C2E" stroke="#FFB443" strokeWidth="1.4" />
        <rect x="126" y="30" width="28" height="60" rx="3" fill="#0F1C2E" stroke="#FFB443" strokeWidth="1.4" />
        <polygon points="180,42 214,52 214,68 180,78" fill="#0F1C2E" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="28" cy="60" r="8" fill={accent} fillOpacity="0.35" />
      </svg>
    )
  }
  if (shipClass === 'Battleship') {
    return (
      <svg width={width} height={height} viewBox="0 0 240 120" role="img" aria-label="Battleship hull">
        <polygon points="18,44 150,38 228,60 150,82 18,76" fill="#0F1C2E" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
        <polygon points="60,40 96,18 120,39" fill="#0F1C2E" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points="60,80 96,102 120,81" fill="#0F1C2E" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="98" cy="60" r="8" fill="none" stroke="#FFB443" strokeWidth="1.6" />
        <circle cx="150" cy="60" r="6" fill="none" stroke="#FFB443" strokeWidth="1.6" />
        <circle cx="20" cy="60" r="9" fill={accent} fillOpacity="0.35" />
      </svg>
    )
  }
  return (
    <svg width={width} height={height} viewBox="0 0 240 120" role="img" aria-label="Scout hull">
      <polygon points="24,60 74,46 158,49 224,60 158,71 74,74" fill="#0F1C2E" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
      <polygon points="92,47 124,18 142,48" fill="#0F1C2E" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points="92,73 124,102 142,72" fill="#0F1C2E" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="26" cy="60" r="8" fill={accent} fillOpacity="0.35" />
    </svg>
  )
}

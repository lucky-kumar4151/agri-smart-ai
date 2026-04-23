import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ── Nav config ──────────────────────────────────────────────────────────── */
const farmerItems = [
  { path: '/dashboard',           label: 'Dashboard',         icon: 'grid'    },
  { path: '/chatbot',             label: 'AI Assistant',      icon: 'message' },
  { path: '/crop-recommendation', label: 'Crop Recommend',    icon: 'leaf'    },
  { path: '/disease-detection',   label: 'Disease Detection', icon: 'scan'    },
  { path: '/expert-guidelines',   label: 'Expert Guidelines', icon: 'book'    },
  { path: '/weather',             label: 'Weather',           icon: 'cloud'   },
  { path: '/market',              label: 'Market Prices',     icon: 'chart'   },
  { path: '/gov-policies',        label: 'Govt Policies',     icon: 'policy'  },
  { path: '/community',           label: 'Community',         icon: 'users'   },
];
const farmerBottomItems = [
  { path: '/history', label: 'History',    icon: 'clock' },
  { path: '/profile', label: 'My Profile', icon: 'user'  },
];
const adminItems = [
  { section: 'dashboard',          label: 'Dashboard',          icon: 'grid'      },
  { section: 'farmers',            label: 'Users Management',   icon: 'users'     },
  { section: 'crop-dataset',       label: 'Crop Dataset',       icon: 'leaf'      },
  { section: 'disease-dataset',    label: 'Disease Dataset',    icon: 'scan'      },
  { section: 'weather',            label: 'Weather',            icon: 'cloud'     },
  { section: 'market',             label: 'Market Prices',      icon: 'chart'     },
  { section: 'chatbot-monitoring', label: 'Chatbot Monitoring', icon: 'message'   },
  { section: 'feedback',           label: 'Feedback & Reports', icon: 'feedback'  },
  { section: 'system-analytics',   label: 'System Analytics',   icon: 'analytics' },
  { section: 'profile',            label: 'My Profile',         icon: 'user'      },
  { section: 'settings',           label: 'Settings',           icon: 'settings'  },
];

/* ── Logo image ─────────────────────────────────────────────────────────── */
const GrainLogo = ({ collapsed }) => (
  <img
    src="/images/logo.jpg"
    alt="AgriSmart"
    style={{
      flexShrink: 0,
      display: 'block',
      width: collapsed ? 40 : '100%',
      height: collapsed ? 40 : 54,
      objectFit: 'contain',
      objectPosition: collapsed ? 'center' : 'left center',
      mixBlendMode: 'screen',
      filter: 'grayscale(100%) contrast(400%)',
      pointerEvents: 'none',
      transform: collapsed ? 'scale(1.5)' : 'scale(1.45)',
      transformOrigin: collapsed ? 'center center' : 'left center',
    }}
  />
);

/* ── Panel toggle icon (ChatGPT style) ─────────────────────────────────── */
const PanelIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </svg>
);

/* ── SVG nav icons ─────────────────────────────────────────────────────── */
const NavIcon = ({ type, size = 18 }) => {
  const s = size;
  const map = {
    grid:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    message:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    leaf:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 20 4 20 4s.5 4.5-1.5 10.2A7 7 0 0 1 11 20z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
    scan:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="4"/></svg>,
    book:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="7" x2="16" y2="7"/><line x1="12" y1="11" x2="16" y2="11"/></svg>,
    cloud:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
    chart:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    users:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    clock:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    user:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    policy:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    feedback:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    analytics: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
    settings:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    logout:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  };
  return map[type] || null;
};

/* ── Tooltip for collapsed nav items ────────────────────────────────────── */
function Tip({ label, show, children }) {
  if (!show) return children;
  return (
    <div className="sb-tip-wrap">
      {children}
      <span className="sb-tip">{label}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Sidebar
   ══════════════════════════════════════════════════════════════════════════ */
export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  const isAdminPage   = location.pathname === '/admin';
  const activeSection = new URLSearchParams(location.search).get('s') || 'dashboard';

  /* navigate + close overlay (mobile fix) */
  const go = (path) => { navigate(path); onClose(); };
  const handleLogout = () => { logout(); navigate('/login'); onClose(); };

  const W = collapsed ? 64 : 240;

  /* ── Nav button ──────────────────────────────────────────────────────── */
  const NavBtn = ({ path, label, icon, isActive }) => (
    <Tip label={label} show={collapsed}>
      <button
        onClick={() => go(path)}
        className={`sidebar-link${isActive ? ' active' : ''}`}
        style={{
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding:        collapsed ? '10px 0'  : '10px 14px',
        }}
      >
        <NavIcon type={icon} />
        {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      </button>
    </Tip>
  );

  const AdminBtn = ({ item, isActive }) => (
    <Tip label={item.label} show={collapsed}>
      <button
        onClick={() => go(`/admin?s=${item.section}`)}
        className={`sidebar-link${isActive ? ' active' : ''}`}
        style={{
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding:        collapsed ? '10px 0'  : '10px 14px',
        }}
      >
        <NavIcon type={item.icon} />
        {!collapsed && <span>{item.label}</span>}
      </button>
    </Tip>
  );

  const items = isAdminPage
    ? adminItems
    : (user?.role === 'admin'
        ? [...farmerItems, { path: '/admin', label: 'Admin Panel', icon: 'settings' }]
        : farmerItems);

  return (
    <>
      <aside
        className={`sidebar${isOpen ? ' open' : ''}`}
        style={{
          width: W, minWidth: W,
          background: 'var(--bg-sidebar)',
          display: 'flex', flexDirection: 'column',
          height: '100vh',
          position: 'fixed', left: 0, top: 0,
          zIndex: 200,
          overflowY: 'auto', overflowX: 'hidden',
          transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* ──────────────────────────────────────────────────────────
            LOGO AREA
            Expanded:  [grain logo] [AgriSmart] --- [panel-icon btn]
            Collapsed: [grain logo only]
                       on hover → logo fades out, panel icon fades in
            ────────────────────────────────────────────────────────── */}
        <div
          onClick={() => go(isAdminPage ? '/admin?s=dashboard' : '/dashboard')}
          className={`sb-logo-area${collapsed ? ' sb-logo-collapsed' : ''}`}
        >
          {/* Grain logo — shown always by default, hidden on hover when collapsed */}
          <span className="sb-logo-icon" style={{ flex: 1, display: 'flex' }}>
            <GrainLogo collapsed={collapsed} />
          </span>

          {/* Panel icon — shown on hover when collapsed */}
          <span className="sb-panel-icon" onClick={e => { e.stopPropagation(); onToggleCollapse(); }}>
            <PanelIcon size={22} />
          </span>

          {/* Text — expanded only (REMOVED text per user request) */}

          {/* Collapse toggle — expanded only, far right */}
          {!collapsed && (
            <button
              className="sb-toggle-btn"
              onClick={e => { e.stopPropagation(); onToggleCollapse(); }}
              title="Collapse sidebar"
            >
              <PanelIcon size={16} />
            </button>
          )}
        </div>

        {/* ── Nav ──────────────────────────────────────────────────── */}
        <nav className="sidebar-nav" style={{ flex: 1 }}>
          {!collapsed && (
            <p className="sidebar-section-label">{isAdminPage ? 'Admin Panel' : 'Main Menu'}</p>
          )}

          {isAdminPage
            ? adminItems.map(item => (
                <AdminBtn key={item.section} item={item} isActive={activeSection === item.section} />
              ))
            : items.map(item => (
                <NavBtn
                  key={item.path}
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                  isActive={location.pathname === item.path}
                />
              ))
          }

          {!isAdminPage && (
            <>
              {!collapsed && <p className="sidebar-section-label" style={{ marginTop: 14 }}>Account</p>}
              {collapsed && <div style={{ height: 10 }} />}
              {farmerBottomItems.map(item => (
                <NavBtn
                  key={item.path}
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                  isActive={location.pathname === item.path}
                />
              ))}
            </>
          )}
        </nav>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="sidebar-footer" style={{ padding: collapsed ? '12px 0' : '12px 14px' }}>
          {!collapsed && (
            <div className="sidebar-user" style={{ marginBottom: 8 }}>
              <div className="sidebar-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className="sidebar-user-info">
                <p>{user?.name || 'User'}</p>
                <p>{user?.role || 'farmer'}</p>
              </div>
            </div>
          )}
          <Tip label="Sign Out" show={collapsed}>
            <button onClick={handleLogout} style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              padding: collapsed ? '8px 0' : '8px 10px', borderRadius: 8,
              border: '1px solid rgba(200,230,201,0.2)',
              background: 'rgba(200,230,201,0.07)',
              color: '#c8e6c9', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
              <NavIcon type="logout" size={14} />
              {!collapsed && 'Sign Out'}
            </button>
          </Tip>
        </div>
      </aside>

      <style>{`
        /* ── Logo area ─────────────────────────────────────────── */
        .sb-logo-area {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 14px;
          border-bottom: 1px solid var(--border-dark);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
        }
        .sb-logo-area:hover { background: rgba(255,255,255,0.04); }



        /* Collapse toggle btn — inside expanded logo area */
        .sb-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(200,230,201,0.55);
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
          z-index: 20;
          transition: background 0.15s, color 0.15s;
        }
        .sb-toggle-btn:hover { background: rgba(255,255,255,0.1); color: #c8e6c9; }
        /* Hide toggle on mobile */
        @media (max-width: 768px) {
          .sb-toggle-btn { display: none !important; }
        }

        /* Panel icon — hidden by default, revealed on hover when collapsed */
        .sb-panel-icon {
          display: none;
          align-items: center;
          justify-content: center;
          color: rgba(200,230,201,0.8);
          position: absolute;
          inset: 0;
          z-index: 20;
          background: var(--bg-sidebar);
          transition: opacity 0.18s;
        }

        /* ── Collapsed logo area: logo shows, panel icon hidden ── */
        .sb-logo-collapsed {
          justify-content: center;
          padding: 16px 0;
        }
        /* On hover when collapsed: hide grain logo, show panel icon */
        .sb-logo-collapsed:hover .sb-logo-icon {
          opacity: 0;
          transition: opacity 0.18s;
        }
        .sb-logo-collapsed:hover .sb-panel-icon {
          display: flex;
          opacity: 1;
        }
        .sb-logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.18s;
        }

        /* ── Tooltip ────────────────────────────────────────────── */
        .sb-tip-wrap { position: relative; display: block; }
        .sb-tip {
          display: none;
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: #1b3a26;
          color: #c8e6c9;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 7px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 4px 16px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .sb-tip::before {
          content: '';
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: #1b3a26;
        }
        .sb-tip-wrap:hover .sb-tip { display: block; }

        /* ── Button sidebar-link styles ─────────────────────────── */
        button.sidebar-link {
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          position: relative;
        }
        button.sidebar-link:hover { background: var(--bg-sidebar-hover) !important; color: white; }
        button.sidebar-link.active {
          background: var(--bg-sidebar-active) !important;
          color: white;
          font-weight: 600;
        }
        button.sidebar-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          width: 3px;
          height: 24px;
          border-radius: 0 3px 3px 0;
          background: #4caf50;
        }
      `}</style>
    </>
  );
}

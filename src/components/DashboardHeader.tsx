'use client';

interface Props {
  user: { email?: string | null } | null;
  onMenuOpen: () => void;
  onLogout: () => void;
}

export default function DashboardHeader({ user, onMenuOpen, onLogout }: Props) {
  return (
    <header className="header-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs hidden sm:block truncate max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>
            {user?.email}
          </span>
          <button onClick={onLogout} className="btn-outline text-sm py-1.5 px-3">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

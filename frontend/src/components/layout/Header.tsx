import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils';

export function Header() {
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/analysis', label: 'Voice Analysis' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-secondary-200 bg-white/80 backdrop-blur-sm">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-600">
            MGCARE
          </Link>
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'text-sm font-medium transition-colors',
                  location.pathname === link.to
                    ? 'text-primary-600'
                    : 'text-secondary-600 hover:text-primary-600'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {/* Auth buttons will be added here */}
          </div>
        </div>
      </div>
    </header>
  );
}

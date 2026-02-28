import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-secondary-200 bg-white/80 backdrop-blur-sm">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-600">
            AUCARE
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {/* Navigation items will be added here */}
          </nav>
          <div className="flex items-center gap-4">
            {/* Auth buttons will be added here */}
          </div>
        </div>
      </div>
    </header>
  );
}

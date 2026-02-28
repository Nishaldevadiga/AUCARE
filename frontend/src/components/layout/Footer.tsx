export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-secondary-200 bg-secondary-50">
      <div className="container-app py-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-secondary-500">
            &copy; {currentYear} AUCARE. All rights reserved.
          </p>
          <nav className="flex gap-6">
            {/* Footer links will be added here */}
          </nav>
        </div>
      </div>
    </footer>
  );
}

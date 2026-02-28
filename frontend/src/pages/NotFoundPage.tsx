import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container-app flex min-h-[60vh] flex-col items-center justify-center py-8">
      <h1 className="mb-2 text-6xl font-bold text-primary-600">404</h1>
      <h2 className="mb-4 text-secondary-600">Page Not Found</h2>
      <p className="mb-8 text-center text-secondary-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary">
        Go Home
      </Link>
    </div>
  );
}

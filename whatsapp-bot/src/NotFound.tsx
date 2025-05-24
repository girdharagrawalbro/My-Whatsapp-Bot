import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 1000);

    return () => clearTimeout(timer); // cleanup
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center px-4">
      <h1 className="text-5xl font-bold text-gray-500 mb-4">404 - Page Not Found</h1>
      <p className="text-lg text-gray-600 mb-6">Redirecting to homepage in 3 seconds...</p>
    </div>
  );
}

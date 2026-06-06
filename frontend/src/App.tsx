import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import useAuthStore from './store/authStore';
import { useAuthInitializer } from './hooks/useAuthInitializer';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { Toaster } from 'react-hot-toast';

function AppContent() {
  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  return <RouterProvider router={router} />;
}

function App() {
  useAuthInitializer();

  return (
    <>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '12px',
            background: '#0f172a',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

export default App;

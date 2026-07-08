import './App.css';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToasts';
import { Toasts } from './components/Toasts';
import { Login } from './components/Login';
import { Shell } from './components/Shell';

function AuthGate() {
  const { session, loading, signOut } = useAuth();

  if (loading) return null;

  return (
    <>
      {session ? <Shell userId={session.user.id} onSignOut={signOut} /> : <Login />}
      <Toasts />
    </>
  );
}

function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <ToastProvider>
        <AuthGate />
      </ToastProvider>
    </>
  );
}

export default App;

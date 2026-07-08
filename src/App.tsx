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
    <div className="bp-field">
      <div className="bp-crop tl" />
      <div className="bp-crop tr" />
      <div className="bp-crop bl" />
      <div className="bp-crop br" />
      <ToastProvider>
        <AuthGate />
      </ToastProvider>
    </div>
  );
}

export default App;

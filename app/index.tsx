import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/AuthProvider';

/** Entry point: route to the app or the auth flow once the session is known. */
export default function Index() {
  const { session, initializing } = useAuth();
  if (initializing) return null;
  return <Redirect href={session ? '/home' : '/welcome'} />;
}

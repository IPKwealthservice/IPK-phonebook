// features/auth/services/auth.service.ts
import { auth } from '@/core/firebase/firebaseConfig';
import { AuthUser, SignInPayload } from '@/features/auth/types';
import { signInWithEmailAndPassword, User } from 'firebase/auth';

export async function firebaseSignIn({ email, password }: SignInPayload): Promise<AuthUser> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return buildAuthUserFromFirebaseUser(result.user);
}

export async function firebaseSignOut(): Promise<void> {
  await auth.signOut();
}

export async function buildAuthUserFromFirebaseUser(user: User): Promise<AuthUser> {
  const token = await user.getIdToken();
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email ?? '',
    name: user.displayName ?? 'No Name',
    phone: user.phoneNumber ?? '',
    gender: 'N/A',
    department: 'N/A',
    token,
  };
}

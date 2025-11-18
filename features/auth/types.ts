export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  gender?: string;
  department?: string;
  role?: 'ADMIN' | 'MARKETING' | 'RM' | 'STAFF' | string;
  uid?: string;
  token?: string;
  firebaseToken?: string;

}

export interface SignInPayload {
  email: string;
  password: string;

}

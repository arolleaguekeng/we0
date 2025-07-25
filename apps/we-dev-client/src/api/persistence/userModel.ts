export interface UserModel {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  sessionToken: string;
  subscription: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  lastLogin: Date;
}

import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Loader2, Mail, Lock, Chrome, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  // Reset mode when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode === 'login');
      setIsForgotPassword(false);
    }
  }, [isOpen, initialMode]);

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return re.test(email.toLowerCase());
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Improved email validation
    if (!validateEmail(email)) {
      toast.error('Silakan gunakan format email @gmail.com yang valid untuk keamanan anda bersama.');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if email is verified
        if (!user.emailVerified) {
          await firebaseSignOut(auth);
          toast.warning('Email anda belum diverifikasi. Silakan cek kotak masuk anda.');
          setIsLoading(false);
          return;
        }

        toast.success('Berhasil masuk ke akun anda!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        await firebaseSignOut(auth);
        toast.success('Pendaftaran berhasil! Silakan cek email anda untuk verifikasi akun sebelum masuk.');
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Metode Email/Password belum diaktifkan di Firebase Console anda.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Email ini sudah terdaftar. Silakan masuk atau gunakan email lain untuk akun anda.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Kata sandi terlalu lemah. Minimal 6 karakter demi keamanan anda.');
      } else if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Email atau kata sandi salah. Silakan periksa kembali data anda.');
      } else {
        toast.error(error.message || 'Terjadi kesalahan pada sistem anda');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast.error('Silakan masukkan email @gmail.com yang valid.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Email pemulihan kata sandi telah dikirim. Silakan cek kotak masuk anda.');
      setIsForgotPassword(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal mengirim email pemulihan. Pastikan email terdaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Berhasil masuk dengan Google');
      onClose();
    } catch (error: any) {
      console.error("Google Sign-in Error:", error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini.');
      } else {
        toast.error('Gagal masuk dengan Google. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl border-none shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-2xl font-black text-slate-900">
            {isForgotPassword ? 'Pulihkan Kata Sandi' : (isLogin ? 'Selamat Datang' : 'Buat Akun Baru')}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {isForgotPassword 
              ? 'Masukkan email anda untuk menerima tautan pemulihan'
              : (isLogin 
                ? 'Sign In untuk mengakses riwayat pemeriksaan anda' 
                : 'Sign Up dengan akun Gmail anda untuk memulai')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                type="email"
                placeholder="Email (harus @gmail.com)"
                className="pl-10 h-12 rounded-xl focus:ring-teal-500 border-slate-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          {!isForgotPassword && (
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Kata Sandi"
                  className="pl-10 h-12 rounded-xl focus:ring-teal-500 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-teal-600 font-bold hover:underline"
                  >
                    Lupa Kata Sandi?
                  </button>
                </div>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold shadow-lg shadow-teal-600/20"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isForgotPassword ? 'Kirim Email Pemulihan' : (isLogin ? 'Sign' : 'Sign Up'))}
          </Button>

          {isForgotPassword && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 font-bold"
              onClick={() => setIsForgotPassword(false)}
              disabled={isLoading}
            >
              Kembali ke Sign In
            </Button>
          )}

          {!isForgotPassword && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-bold">Atau</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 font-bold flex gap-2"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Chrome className="w-5 h-5 text-blue-600" />
                Sign In dengan Google
              </Button>
            </>
          )}
        </form>

        <DialogFooter className="sm:justify-center border-t border-slate-50 pt-4">
          <p className="text-sm text-slate-500">
            {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setIsForgotPassword(false);
              }}
              className="ml-1 text-teal-600 font-bold hover:underline"
            >
              {isLogin ? 'Sign Up Sekarang' : 'Sign In Disini'}
            </button>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
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
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Gmail domain validation for registration
    if (!isLogin && !email.toLowerCase().endsWith('@gmail.com')) {
      toast.error('Hanya akun Gmail yang diperbolehkan');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Berhasil masuk');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Pendaftaran berhasil');
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Terjadi kesalahan');
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
      toast.error('Gagal masuk dengan Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl border-none shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-2xl font-black text-slate-900">
            {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {isLogin 
              ? 'Masuk untuk mengakses riwayat pemeriksaan Anda' 
              : 'Daftar dengan akun Gmail Anda untuk memulai'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAuth} className="space-y-4 py-4">
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
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold shadow-lg shadow-teal-600/20"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Masuk' : 'Daftar')}
          </Button>

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
            Masuk dengan Google
          </Button>
        </form>

        <DialogFooter className="sm:justify-center border-t border-slate-50 pt-4">
          <p className="text-sm text-slate-500">
            {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-teal-600 font-bold hover:underline"
            >
              {isLogin ? 'Daftar Sekarang' : 'Masuk Disini'}
            </button>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

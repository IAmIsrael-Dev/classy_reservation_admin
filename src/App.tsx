import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Toaster } from './components/ui/sonner';
import { AdminApp } from './components/admin-app';
import { useAdminAuth } from './lib/admin-auth';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Shield, 
  Lock,
  Mail,
  LogOut,
  Crown,
  User,
  Loader2
} from 'lucide-react';

export default function App() {
  const { isAuthenticated, currentAdmin, loading, signIn, signOut } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    const result = await signIn(email, password);

    if (result.success) {
      toast.success('Successfully signed in!');
      setEmail('');
      setPassword('');
    } else {
      setError(result.error || 'Invalid email or password');
      toast.error(result.error || 'Invalid email or password');
    }
    
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    signOut();
    toast.success('Successfully signed out');
  };

  const quickLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLoggingIn(true);
    
    const result = await signIn(demoEmail, demoPassword);
    
    if (result.success) {
      toast.success('Successfully signed in!');
      setEmail('');
      setPassword('');
    } else {
      toast.error(result.error || 'Authentication failed');
    }
    
    setIsLoggingIn(false);
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show admin interface
  if (isAuthenticated) {
    const roleInfo = { title: 'Admin Platform', icon: Shield, gradient: 'from-indigo-600 to-blue-600' };
    const RoleIcon = roleInfo.icon;

    return (
      <>
        <Toaster richColors position="top-right" />
        <div className="min-h-screen bg-slate-900">
          {/* App Header - Tablet Optimized */}
        <div className="border-b bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50 border-slate-700">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${roleInfo.gradient} rounded-lg flex items-center justify-center shadow-lg`}
                >
                  <RoleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-base sm:text-lg md:text-xl text-slate-100">ReserveAI</h1>
                  <p className="text-xs sm:text-sm text-slate-400">{roleInfo.title}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="hidden sm:flex items-center gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-slate-700/50 rounded-lg">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                  <span className="text-xs sm:text-sm text-slate-200">{currentAdmin?.name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white h-8 sm:h-9 px-2 sm:px-3"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
          <AdminApp />
        </div>
      </>
    );
  }

  // Login Screen
  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-xl">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl text-slate-100">ReserveAI</h1>
                <p className="text-slate-400">Restaurant Ecosystem</p>
              </div>
            </div>

            <div className="space-y-4 pt-8">
              <h2 className="text-4xl text-slate-100">
                Welcome to the{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Admin Platform
                </span>
              </h2>
              <p className="text-lg text-slate-400">
                Comprehensive administrative control for your restaurant reservation ecosystem.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6">
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span className="text-slate-200">AI-Powered</span>
                </div>
                <p className="text-sm text-slate-400">Intelligent automation throughout</p>
              </Card>
              
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-200">Secure Access</span>
                </div>
                <p className="text-sm text-slate-400">Role-based permissions</p>
              </Card>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="p-8 bg-slate-800 border-slate-700 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-2xl text-slate-100 mb-2">Sign In</h3>
                <p className="text-slate-400">Enter your credentials to access your portal</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2"
                    >
                      <p className="text-sm text-red-400">{error}</p>
                      {error.includes('System') && (
                        <div className="text-xs text-slate-400 mt-2 space-y-1">
                          <p className="text-slate-300">📋 Quick Fix:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Go to Firebase Console → Firestore Database → Rules</li>
                            <li>Set rules to: <code className="text-slate-300 bg-slate-800 px-1 rounded">allow read, write: if true;</code></li>
                            <li>Click Publish and wait 10 seconds</li>
                            <li>Try signing in again</li>
                          </ol>
                          <p className="mt-2 text-slate-300">See <code className="bg-slate-800 px-1 rounded">QUICK_SETUP_GUIDE.md</code> for details</p>
                        </div>
                      )}
                      {error.includes('permission') && (
                        <div className="text-xs text-slate-400 mt-2">
                          <p className="text-slate-300">🔒 Firebase Rules Issue:</p>
                          <p>Your Firebase security rules are blocking access. See <code className="bg-slate-800 px-1 rounded">QUICK_SETUP_GUIDE.md</code> for setup instructions.</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                >
                  {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-4">Quick Access:</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('admin@demo.com', 'admin0987')}
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-blue-500"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Login
                </Button>
                <p className="text-xs text-slate-500 mt-4 text-center">
                  Master password: <code className="text-slate-400">admin0987</code>
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
}
import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useAdminAuth } from '../lib/admin-auth';
import { 
  Shield, 
  UserPlus, 
  Mail, 
  User, 
  Calendar,
  CheckCircle2,
  Trash2,
  Crown
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdminUser {
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  lastLogin?: Date;
}

export function AdminManagement() {
  const { currentAdmin, getAllAdmins } = useAdminAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [allAdmins, setAllAdmins] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);

  // Load all admins on mount
  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setIsLoadingAdmins(true);
    const admins = await getAllAdmins();
    setAllAdmins(admins);
    setIsLoadingAdmins(false);
  };

  const handleInviteAdmin = async () => {
    if (!inviteEmail || !inviteName) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if admin already exists
    const existingAdmin = allAdmins.find(admin => admin.email === inviteEmail);
    if (existingAdmin) {
      toast.error('This email is already an admin');
      return;
    }

    setIsInviting(true);
    try {
      // Create new admin in Firebase
      const newAdmin: AdminUser = {
        email: inviteEmail,
        name: inviteName,
        role: 'admin',
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'admins', inviteEmail), newAdmin);
      
      toast.success(`Admin invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      
      // Reload admins list
      await loadAdmins();
    } catch (error) {
      console.error('Error inviting admin:', error);
      toast.error('Failed to invite admin. Please try again.');
    }
    setIsInviting(false);
  };

  const handleRemoveAdmin = async (email: string) => {
    // Prevent removing yourself
    if (email === currentAdmin?.email) {
      toast.error('You cannot remove yourself from admins');
      return;
    }

    // Prevent removing the last admin
    if (allAdmins.length <= 1) {
      toast.error('Cannot remove the last admin');
      return;
    }

    try {
      await deleteDoc(doc(db, 'admins', email));
      toast.success('Admin removed successfully');
      
      // Reload admins list
      await loadAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Admin Info - Featured Section */}
      <Card className="p-6 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-blue-500/30">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl text-slate-100 mb-1">Currently Logged In</h3>
              <p className="text-sm text-slate-400">Your admin session details</p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>

        {currentAdmin && (
          <div className="space-y-3">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <div className="text-xs text-slate-400 mb-1">Email Address</div>
                  <div className="text-lg text-slate-100">{currentAdmin.email}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Name</div>
                    <div className="text-slate-100">{currentAdmin.name}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex items-center gap-3">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Role</div>
                    <div className="text-slate-100 capitalize">{currentAdmin.role}</div>
                  </div>
                </div>
              </div>
            </div>

            {currentAdmin.lastLogin && (
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">Last login:</span>
                  <span className="text-slate-100">
                    {new Date(currentAdmin.lastLogin).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Invite New Admin */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl text-slate-100">Invite New Admin</h3>
            <p className="text-sm text-slate-400">Grant admin access to another user</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="invite-email" className="text-slate-200">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="admin@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="bg-slate-700 border-slate-600 text-slate-100 mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              This user will be able to sign in with the master password
            </p>
          </div>

          <div>
            <Label htmlFor="invite-name" className="text-slate-200">Full Name</Label>
            <Input
              id="invite-name"
              type="text"
              placeholder="John Doe"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="bg-slate-700 border-slate-600 text-slate-100 mt-2"
            />
          </div>
        </div>

        <Button 
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleInviteAdmin}
          disabled={isInviting}
        >
          {isInviting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Inviting...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Admin
            </>
          )}
        </Button>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            <strong>Note:</strong> Invited admins can sign in immediately using their email and the master password.
          </p>
        </div>
      </Card>

      {/* All Admins List */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl text-slate-100">All Admins</h3>
              <p className="text-sm text-slate-400">
                {allAdmins.length} {allAdmins.length === 1 ? 'admin' : 'admins'} with access
              </p>
            </div>
          </div>
        </div>

        {isLoadingAdmins ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Loading admins...</p>
          </div>
        ) : allAdmins.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No admins found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allAdmins.map((admin) => {
              const isCurrentUser = admin.email === currentAdmin?.email;
              
              return (
                <div
                  key={admin.email}
                  className={`p-4 rounded-lg border ${
                    isCurrentUser
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-slate-700/50 border-slate-700'
                  } transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isCurrentUser
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                          : 'bg-gradient-to-br from-slate-600 to-slate-700'
                      }`}>
                        <User className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-slate-100 truncate">{admin.name}</h4>
                          {isCurrentUser && (
                            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50 text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 truncate">{admin.email}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Joined {new Date(admin.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {admin.lastLogin && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                              <span>
                                Last active {new Date(admin.lastLogin).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Badge className="bg-purple-500/20 text-purple-400 capitalize">
                        {admin.role}
                      </Badge>
                      
                      {!isCurrentUser && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:border-red-600"
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${admin.name} from admins?`)) {
                              handleRemoveAdmin(admin.email);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Security Notice */}
      <Card className="p-4 bg-amber-500/10 border-amber-500/30">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-400 mb-1">Security Notice</h4>
            <p className="text-sm text-amber-400/80">
              All admins can sign in using their email and the master password. Make sure to only invite trusted users and change the master password regularly.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
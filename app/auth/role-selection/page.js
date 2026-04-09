'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createUser } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { USER_ROLES } from '@/utils/constants';

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const router = useRouter();

  const roles = [
    {
      id: USER_ROLES.CREW,
      title: 'Join as Crew',
      description: 'Showcase your skills and get booked for projects',
      icon: '🎬',
      color: 'bg-primary',
    },
    {
      id: USER_ROLES.ORGANIZER,
      title: 'Join as Organizer',
      description: 'Find and book professional crew members',
      icon: '📋',
      color: 'bg-secondary',
    },
  ];

  const handleSelectRole = async (roleId) => {
    if (!currentUser) {
      setError('Please sign in first');
      return;
    }

    setSelectedRole(roleId);
    setLoading(true);
    setError('');

    try {
      console.log('[v0] Creating user with role:', roleId);
      const result = await createUser(currentUser.uid, {
        email: currentUser.email || '',
        phone: currentUser.phoneNumber || '',
        role: roleId,
        uid: currentUser.uid,
      });

      if (result.success) {
        console.log('[v0] User created successfully');
        
        // Redirect based on role
        if (roleId === USER_ROLES.CREW) {
          router.push('/crew/setup');
        } else if (roleId === USER_ROLES.ORGANIZER) {
          router.push('/organizer/setup');
        }
      } else {
        setError(result.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('[v0] Role selection error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to CrewHive</h1>
          <p className="text-muted-foreground text-lg">
            How do you want to use CrewHive?
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 mb-8">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelectRole(role.id)}
              disabled={loading}
              className={`p-8 rounded-lg border-2 transition-all ${
                loading && selectedRole === role.id
                  ? 'opacity-75 cursor-not-allowed'
                  : 'hover:border-primary hover:shadow-lg'
              } ${
                selectedRole === role.id
                  ? `border-primary ${role.color} text-white`
                  : 'border-border bg-card hover:bg-muted'
              }`}
            >
              <div className="text-5xl mb-4">{role.icon}</div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">{role.title}</h2>
              <p className={`mb-6 ${selectedRole === role.id ? 'text-white' : 'text-muted-foreground'}`}>
                {role.description}
              </p>
              <Button
                className={`w-full font-medium ${
                  selectedRole === role.id
                    ? 'bg-white text-primary hover:bg-gray-100'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
                disabled={loading}
              >
                {loading && selectedRole === role.id ? 'Setting up...' : 'Select'}
              </Button>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          You can change your role later in settings
        </p>
      </div>
    </div>
  );
}

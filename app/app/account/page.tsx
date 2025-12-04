'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';

export default function AccountPage() {
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
      setCreatedAt(new Date(user.created_at).toLocaleDateString());
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gradient mb-2">Account</h1>
        <p className="text-muted-foreground">
          Manage your Campaign Ally account
        </p>
      </div>

      <Card className="bg-card border-primary/20">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="text-lg">{email}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Member Since</div>
            <div className="text-lg">{createdAt}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Plan</div>
            <div className="text-lg">Free (3 Panic uses per day)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in result:', {
        hasData: !!data,
        hasSession: !!data?.session,
        sessionId: data?.session?.access_token?.substring(0, 20),
        error: error?.message
      });

      if (error) {
        console.error('Sign in error:', error);
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Error',
            description: 'Email or password incorrect.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      console.log('Sign in successful, checking cookies...');
      console.log('All cookies:', document.cookie);

      // Verify session was stored by reading it back
      const { data: checkData } = await supabase.auth.getSession();
      console.log('Verification - session stored?', !!checkData.session);

      // Wait a moment for cookies to be fully set before redirecting
      setTimeout(() => {
        console.log('Redirecting to /app');
        window.location.href = '/app';
      }, 200);
    } catch (error) {
      console.error('Sign in exception:', error);
      toast({
        title: 'Error',
        description: 'Connection lost. Check your internet.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-weave p-4">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Sparkles className="h-10 w-10 text-primary" />
            <CardTitle className="text-3xl font-bold">Campaign Ally</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground mt-2">
            Sign in to continue your adventure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="dm@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-secondary border-border"
              />
            </div>
            <Button
              type="submit"
              className="w-full glow-teal-hover"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

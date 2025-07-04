import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, type SupabaseUser, type AuthSession } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error?: any }>;
  updateProfile: (updates: any) => Promise<{ error?: any }>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
  updatePassword: (password: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({}),
  signOut: async () => {},
  signUp: async () => ({}),
  updateProfile: async () => ({}),
  resetPassword: async () => ({}),
  updatePassword: async () => ({})
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Set a timeout to ensure loading doesn't hang forever
    timeoutId = setTimeout(() => {
      console.log('⏰ Auth timeout - stopping loading state');
      setLoading(false);
    }, 5000); // 5 second timeout

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId); // Clear timeout on successful response
        
        if (error) {
          console.error('❌ Session error:', error);
          setLoading(false);
          return;
        }

        console.log('📊 Session:', session ? 'Found' : 'Not found');
        
        if (session?.user) {
          console.log('👤 User found, setting user data...');
          
          // Use metadata from Supabase session
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || session.user.email,
            role: session.user.user_metadata?.role || 'user'
          };
          
          console.log('📋 User data:', userData);
          setUser(userData);
          setSession(session);
        }
        setLoading(false);
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session ? 'Session exists' : 'No session');
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔐 Processing sign in for user:', session.user.email);
            
            // Use user metadata directly for faster login
            const userData = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name || session.user.email,
              role: session.user.user_metadata?.role || 'user'
            };
            
            console.log('✅ User data set:', userData);
            setUser(userData);
            setSession(session);
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 Processing sign out');
            setUser(null);
            setSession(null);
          }
          setLoading(false);
        } catch (error) {
          console.error('❌ Auth state change error:', error);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Login error:', error);
        setLoading(false);
        return { error };
      }

      console.log('✅ Login successful, processing user data...');
      
      // Set user data immediately for faster response
      if (data.user) {
        const userData = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || data.user.email,
          role: data.user.user_metadata?.role || 'user'
        };
        
        console.log('👤 Setting user data:', userData);
        setUser(userData);
        setSession(data.session);
      }
      
      setLoading(false);
      return { data };
    } catch (error) {
      console.error('❌ Login exception:', error);
      setLoading(false);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) return { error };

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null);
      return {};
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) return { error };
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) return { error };
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    signUp,
    updateProfile,
    resetPassword,
    updatePassword
  };
};

export { AuthContext };
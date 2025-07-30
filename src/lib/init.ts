import { app, auth, analytics } from './firebase';
import { getSupabaseClient } from './supabase';

export async function initializeServices() {
  // Initialize Firebase services
  try {
    // Firebase app and auth are already initialized in firebase.ts
    // Just verify the initialization
    if (!app || !auth) {
      throw new Error('Firebase failed to initialize');
    }

    // Initialize Supabase client
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client failed to initialize');
    }

    console.log('All services initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing services:', error);
    throw error;
  }
} 
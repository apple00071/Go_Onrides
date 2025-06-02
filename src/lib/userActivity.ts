import { getSupabaseClient } from '@/lib/supabase';
import type { UserLog } from '@/types/database';

/**
 * Log user activity
 * @param userId User ID
 * @param actionType Type of action (login, logout, create, update, delete)
 * @param entityType Type of entity (user, booking, customer, payment, document, vehicle)
 * @param entityId ID of the entity
 * @param details Additional details about the action
 * @param userEmail Optional user email (for users not in the system yet)
 */
export async function logUserActivity(
  userId: string,
  actionType: UserLog['action_type'],
  entityType: UserLog['entity_type'],
  entityId: string,
  details: any = {},
  userEmail?: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('user_logs').insert({
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      details,
      user_email: userEmail
    });

    if (error) {
      console.error('Error logging user activity:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to log user activity:', error);
    return false;
  }
}

/**
 * Get user activity logs
 * @param options Filter options
 */
export async function getUserLogs(options: {
  userId?: string;
  actionType?: UserLog['action_type'];
  entityType?: UserLog['entity_type'];
  entityId?: string;
  limit?: number;
  offset?: number;
  from?: Date;
  to?: Date;
} = {}): Promise<{ logs: UserLog[], count: number }> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('user_logs').select('*', { count: 'exact' });
    
    // Apply filters
    if (options.userId) query = query.eq('user_id', options.userId);
    if (options.actionType) query = query.eq('action_type', options.actionType);
    if (options.entityType) query = query.eq('entity_type', options.entityType);
    if (options.entityId) query = query.eq('entity_id', options.entityId);
    
    // Apply date filters
    if (options.from) query = query.gte('created_at', options.from.toISOString());
    if (options.to) query = query.lte('created_at', options.to.toISOString());
    
    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(
        options.offset || 0, 
        options.offset !== undefined && options.limit !== undefined
          ? options.offset + options.limit - 1
          : 49 // Default limit of 50
      );
    
    const { data, count, error } = await query;
    
    if (error) {
      console.error('Error fetching user logs:', error);
      return { logs: [], count: 0 };
    }
    
    return { 
      logs: data || [], 
      count: count || 0 
    };
  } catch (error) {
    console.error('Failed to fetch user logs:', error);
    return { logs: [], count: 0 };
  }
} 
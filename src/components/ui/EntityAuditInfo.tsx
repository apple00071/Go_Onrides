'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface EntityAuditInfoProps {
  entityType: 'booking' | 'payment' | 'document';
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export function EntityAuditInfo({ entityType, createdAt, updatedAt, createdBy, updatedBy }: EntityAuditInfoProps) {
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [updaterName, setUpdaterName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const wasUpdated = updatedAt && new Date(updatedAt).getTime() > new Date(createdAt).getTime();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // Fetch creator details if createdBy exists
        if (createdBy) {
          const { data: creatorData, error: creatorError } = await supabase
            .from('users')
            .select('email, first_name, last_name')
            .eq('id', createdBy)
            .single();

          if (creatorData && !creatorError) {
            if (creatorData.first_name && creatorData.last_name) {
              setCreatorName(`${creatorData.first_name} ${creatorData.last_name}`);
            } else {
              setCreatorName(creatorData.email);
            }
          }
        }
        
        // Fetch updater details if updatedBy exists and is different from createdBy
        if (updatedBy && updatedBy !== createdBy) {
          const { data: updaterData, error: updaterError } = await supabase
            .from('users')
            .select('email, first_name, last_name')
            .eq('id', updatedBy)
            .single();

          if (updaterData && !updaterError) {
            if (updaterData.first_name && updaterData.last_name) {
              setUpdaterName(`${updaterData.first_name} ${updaterData.last_name}`);
            } else {
              setUpdaterName(updaterData.email);
            }
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setIsLoading(false);
      }
    };

    if (createdBy || updatedBy) {
      fetchUserDetails();
    } else {
      setIsLoading(false);
    }
  }, [createdBy, updatedBy]);

  if (isLoading) {
    return <div className="text-xs text-gray-400">Loading...</div>;
  }

  return (
    <div className="text-xs text-gray-500">
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center">
                <User size={14} className="mr-1 text-gray-400" />
                {creatorName || 'Unknown user'}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Created {formatTime(createdAt)}</p>
            </TooltipContent>
          </Tooltip>
          
          {wasUpdated && updaterName && (
            <>
              <span className="mx-1">•</span>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center">
                    <span className="text-xs italic">Updated by {updaterName}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last updated {formatTime(updatedAt)}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}

// Helper function to format time
function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return `${formatDistanceToNow(date, { addSuffix: true })} (${date.toLocaleString()})`;
  } catch (error) {
    return 'Invalid date';
  }
} 
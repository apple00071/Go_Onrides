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

interface UserInfo {
  username: string;
}

export function EntityAuditInfo({
  entityType,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy
}: EntityAuditInfoProps) {
  const [creatorInfo, setCreatorInfo] = useState<UserInfo | null>(null);
  const [updaterInfo, setUpdaterInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const supabase = getSupabaseClient();

      if (createdBy) {
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', createdBy)
          .single();
        if (creatorData) setCreatorInfo(creatorData);
      }

      if (updatedBy) {
        const { data: updaterData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', updatedBy)
          .single();
        if (updaterData) setUpdaterInfo(updaterData);
      }
    };

    fetchUserInfo();
  }, [createdBy, updatedBy]);

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Created {creatorInfo?.username ? `by ${creatorInfo.username}` : ''}</p>
            {updaterInfo?.username && (
              <p>Last updated by {updaterInfo.username}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 
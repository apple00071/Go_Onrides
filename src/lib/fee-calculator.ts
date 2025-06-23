import { getSupabaseClient } from '@/lib/supabase';
import { differenceInHours, isAfter, startOfDay, endOfDay } from 'date-fns';

interface FeeSettings {
  lateFee: {
    amount: number;
    gracePeriodHours: number;
  };
  extensionFee: {
    amount: number;
    thresholdHours: number;
  };
}

/**
 * Fetches the fee settings from app_settings table
 */
export async function getFeeSettings(): Promise<FeeSettings> {
  const supabase = getSupabaseClient();
  
  // Get late fee settings
  const { data: lateFeeData, error: lateFeeError } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'late_fee')
    .single();
  
  // Get extension fee settings
  const { data: extensionFeeData, error: extensionFeeError } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'extension_fee')
    .single();
  
  // Default values if settings don't exist
  const defaultSettings: FeeSettings = {
    lateFee: {
      amount: 1000,
      gracePeriodHours: 2
    },
    extensionFee: {
      amount: 1000,
      thresholdHours: 6
    }
  };
  
  if (lateFeeError || extensionFeeError) {
    console.error('Error fetching fee settings:', lateFeeError || extensionFeeError);
    return defaultSettings;
  }
  
  return {
    lateFee: {
      amount: lateFeeData?.setting_value?.amount || defaultSettings.lateFee.amount,
      gracePeriodHours: lateFeeData?.setting_value?.grace_period_hours || defaultSettings.lateFee.gracePeriodHours
    },
    extensionFee: {
      amount: extensionFeeData?.setting_value?.amount || defaultSettings.extensionFee.amount,
      thresholdHours: extensionFeeData?.setting_value?.threshold_hours || defaultSettings.extensionFee.thresholdHours
    }
  };
}

/**
 * Calculates late fee and extension fee based on scheduled and actual return times
 * @param scheduledEndDate Scheduled end date (YYYY-MM-DD)
 * @param scheduledDropoffTime Scheduled dropoff time (HH:MM)
 * @param actualReturnTime Actual return time (ISO string)
 */
export async function calculateReturnFees(returnTime: Date, expectedReturnTime: Date) {
  const supabase = getSupabaseClient();

  // Fetch fee settings
  const { data: lateFeeData } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'late_fee')
    .single();

  const { data: extensionFeeData } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'extension_fee')
    .single();

  const settings: FeeSettings = {
    lateFee: {
      amount: lateFeeData?.setting_value?.amount || 1000,
      gracePeriodHours: lateFeeData?.setting_value?.grace_period_hours || 2
    },
    extensionFee: {
      amount: extensionFeeData?.setting_value?.amount || 1000,
      thresholdHours: extensionFeeData?.setting_value?.threshold_hours || 6
    }
  };

  let lateFee = 0;
  let extensionFee = 0;

  // Calculate late fee
  const hoursLate = differenceInHours(returnTime, expectedReturnTime);
  if (hoursLate > settings.lateFee.gracePeriodHours) {
    lateFee = settings.lateFee.amount;
  }

  // Calculate extension fee
  const isAfterMidnight = isAfter(returnTime, endOfDay(expectedReturnTime));
  const hoursExtended = differenceInHours(returnTime, startOfDay(expectedReturnTime));
  if (isAfterMidnight || hoursExtended > settings.extensionFee.thresholdHours) {
    extensionFee = settings.extensionFee.amount;
  }

  return {
    lateFee,
    extensionFee,
    totalFees: lateFee + extensionFee
  };
} 
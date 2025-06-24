import { getSupabaseClient } from '@/lib/supabase';
import { differenceInHours, isAfter, endOfDay, parseISO } from 'date-fns';

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
 * @param returnTime Actual return time
 * @param expectedReturnTime Expected return time
 */
export async function calculateReturnFees(returnTime: Date, expectedReturnTime: Date) {
  const settings = await getFeeSettings();

  let lateFee = 0;
  let extensionFee = 0;

  // Calculate late fee
  const hoursLate = differenceInHours(returnTime, expectedReturnTime);
  if (hoursLate > settings.lateFee.gracePeriodHours) {
    lateFee = settings.lateFee.amount;
  }

  // Calculate extension fee - only apply if:
  // 1. Return time is after midnight of the expected return date, OR
  // 2. The total duration of the booking exceeds the threshold hours
  const isAfterMidnight = isAfter(returnTime, endOfDay(expectedReturnTime));
  if (isAfterMidnight) {
    extensionFee = settings.extensionFee.amount;
  }

  return {
    lateFee,
    extensionFee,
    totalFees: lateFee + extensionFee
  };
} 
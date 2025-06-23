import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { CurrencyInput } from '@/components/ui/currency-input';

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

export default function FeeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FeeSettings>({
    lateFee: {
      amount: 1000,
      gracePeriodHours: 2
    },
    extensionFee: {
      amount: 1000,
      thresholdHours: 6
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
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

      if (lateFeeError || extensionFeeError) {
        console.error('Error fetching settings:', lateFeeError || extensionFeeError);
        return;
      }

      setSettings({
        lateFee: {
          amount: lateFeeData?.setting_value?.amount || 1000,
          gracePeriodHours: lateFeeData?.setting_value?.grace_period_hours || 2
        },
        extensionFee: {
          amount: extensionFeeData?.setting_value?.amount || 1000,
          thresholdHours: extensionFeeData?.setting_value?.threshold_hours || 6
        }
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    feeType: 'lateFee' | 'extensionFee',
    field: 'amount' | 'gracePeriodHours' | 'thresholdHours',
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setSettings(prev => ({
      ...prev,
      [feeType]: {
        ...prev[feeType],
        [field]: numValue
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const supabase = getSupabaseClient();

      // Update late fee settings
      const { error: lateFeeError } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'late_fee',
          setting_value: {
            amount: settings.lateFee.amount,
            grace_period_hours: settings.lateFee.gracePeriodHours
          }
        });

      // Update extension fee settings
      const { error: extensionFeeError } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'extension_fee',
          setting_value: {
            amount: settings.extensionFee.amount,
            threshold_hours: settings.extensionFee.thresholdHours
          }
        });

      if (lateFeeError || extensionFeeError) {
        throw new Error('Failed to update settings');
      }

      toast.success('Fee settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update fee settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="space-y-6">
        {/* Late Fee Settings */}
        <div>
          <h3 className="text-sm font-medium text-gray-900">Late Fee</h3>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fee Amount
              </label>
              <CurrencyInput
                value={settings.lateFee.amount.toString()}
                onChange={(e) => handleInputChange('lateFee', 'amount', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Grace Period (hours)
              </label>
              <input
                type="number"
                min="0"
                value={settings.lateFee.gracePeriodHours}
                onChange={(e) => handleInputChange('lateFee', 'gracePeriodHours', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Late fee will be charged if vehicle is returned after the grace period
          </p>
        </div>

        {/* Extension Fee Settings */}
        <div>
          <h3 className="text-sm font-medium text-gray-900">Extension Fee</h3>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fee Amount
              </label>
              <CurrencyInput
                value={settings.extensionFee.amount.toString()}
                onChange={(e) => handleInputChange('extensionFee', 'amount', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Threshold Hours
              </label>
              <input
                type="number"
                min="0"
                value={settings.extensionFee.thresholdHours}
                onChange={(e) => handleInputChange('extensionFee', 'thresholdHours', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Extension fee will be charged if vehicle is returned after midnight or after the threshold hours
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
} 
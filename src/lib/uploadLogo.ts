import { getSupabaseClient } from '@/lib/supabase';

export const uploadLogo = async (logoFile: File): Promise<void> => {
  try {
    // Convert file to base64
    const base64Logo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Extract only the base64 data without the data URL prefix
        const base64Data = base64.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(logoFile);
    });

    const supabase = getSupabaseClient();

    // Check if there's an existing logo
    const { data: existingSettings } = await supabase
      .from('company_settings')
      .select('id')
      .single();

    if (existingSettings) {
      // Update existing logo
      const { error } = await supabase
        .from('company_settings')
        .update({ 
          logo: base64Logo,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id);

      if (error) throw error;
    } else {
      // Insert new logo
      const { error } = await supabase
        .from('company_settings')
        .insert([{ 
          logo: base64Logo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
}; 
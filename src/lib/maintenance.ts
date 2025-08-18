import { getSupabaseClient } from './supabase';

export async function clearMaintenanceRecords() {
  try {
    const supabase = getSupabaseClient();

    // First delete maintenance records - delete all records without any condition
    const { error: maintenanceError } = await supabase
      .from('vehicle_maintenance')
      .delete()
      .is('id', 'is not null'); // This will match all records

    if (maintenanceError) {
      console.error('Error deleting maintenance records:', maintenanceError);
      throw maintenanceError;
    }

    // Then delete battery records - delete all records without any condition
    const { error: batteryError } = await supabase
      .from('vehicle_batteries')
      .delete()
      .is('id', 'is not null'); // This will match all records

    if (batteryError) {
      console.error('Error deleting battery records:', batteryError);
      throw batteryError;
    }

    // Reset vehicle maintenance dates
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({
        last_maintenance_date: null,
        next_maintenance_date: null,
        updated_at: new Date().toISOString()
      })
      .is('registration', 'is not null'); // This will match all records

    if (vehicleError) {
      console.error('Error resetting vehicle maintenance dates:', vehicleError);
      throw vehicleError;
    }

    // Delete files from storage
    const { data: files, error: listError } = await supabase.storage
      .from('maintenance')
      .list('battery');

    if (listError) {
      console.error('Error listing files:', listError);
      throw listError;
    }

    if (files && files.length > 0) {
      const filesToDelete = files.map(file => `battery/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from('maintenance')
        .remove(filesToDelete);

      if (deleteError) {
        console.error('Error deleting files:', deleteError);
        throw deleteError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing maintenance records:', error);
    throw error;
  }
} 
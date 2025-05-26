import fetch from 'node-fetch';

async function fixAdminProfile() {
  try {
    const response = await fetch('http://localhost:3000/api/fix-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fix admin profile');
    }

    console.log('Admin profile fixed successfully!');
  } catch (error) {
    console.error('Error fixing admin profile:', error);
  }
}

fixAdminProfile(); 
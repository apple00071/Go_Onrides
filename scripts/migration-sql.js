// Simple script to output the migration SQL for manual execution
const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20240701000000_create_booking_extensions_if_not_exists.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

console.log('To fix the "relation public.booking_extensions does not exist" error:');
console.log('\nCopy the SQL below and execute it in your Supabase SQL Editor:');
console.log('\n------- Copy SQL below -------\n');
console.log(migrationSql);
console.log('\n------- End SQL -------\n');
console.log('Go to https://app.supabase.com/project/_/sql and paste this SQL');
console.log('Replace "_" in the URL with your actual Supabase project ID'); 
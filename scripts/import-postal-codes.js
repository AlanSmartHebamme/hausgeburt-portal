// This script reads a local CSV of German postal codes, processes it,
// and uploads the data to your Supabase `postal_codes` table.
// Run it once from your terminal: `node scripts/import-postal-codes.js`

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURATION ---
const CSV_FILE_PATH = path.join(__dirname, '../data/postal_codes.csv');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 500; // How many rows to insert at once

// --- SCRIPT ---

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Supabase URL or Service Role Key is not defined in your .env.local file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('Starting postal code import...');

  try {
    // 1. Read the local CSV file
    console.log(`Reading data from ${CSV_FILE_PATH}...`);
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
    }
    const csvText = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    console.log('File read complete.');

    // 2. Parse the CSV
    console.log('Parsing CSV data...');
    const parser = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    const records = [];
    for await (const record of parser) {
      records.push(record);
    }
    console.log(`Parsed ${records.length} records.`);

    // 3. Transform data to match our table schema
    const transformedData = records.map(record => ({
      country_code: 'DE',
      postal_code: record.plz,
      city: null, // The new CSV doesn't have a city column
      latitude: parseFloat(record.lat),
      longitude: parseFloat(record.lng), // Use 'lng' from the new CSV
    }));

    // 4. Clear existing sample data (optional, but good for a clean slate)
    console.log('Clearing existing postal code data...');
    const { error: deleteError } = await supabase.from('postal_codes').delete().neq('id', 0); // Delete all
    if (deleteError) throw deleteError;
    console.log('Existing data cleared.');

    // 5. Insert data in batches
    console.log(`Inserting data in batches of ${BATCH_SIZE}...`);
    for (let i = 0; i < transformedData.length; i += BATCH_SIZE) {
      const batch = transformedData.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from('postal_codes').insert(batch);
      if (insertError) {
        throw insertError;
      }
      console.log(`Batch ${i / BATCH_SIZE + 1} of ${Math.ceil(transformedData.length / BATCH_SIZE)} inserted.`);
    }

    console.log('\n✅ Import successful!');
    console.log('Your `postal_codes` table is now populated with all German postal codes.');

  } catch (error) {
    console.error('\n❌ An error occurred during the import process:');
    console.error(error.message);
    process.exit(1);
  }
}

main();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' }); // Load logic from front env
dotenv.config({ path: './.env' }); // Server role key

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking columns in "chapters" table...');

    // Try to insert a dummy row or select specific columns to see if it fails
    // Actually, let's just inspect one row with *
    const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting *:', error);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        const cols = Object.keys(data[0]);
        console.log('Has "briefing"?', cols.includes('briefing'));
        console.log('Has "critique"?', cols.includes('critique'));
        console.log('Has "content_hash"?', cols.includes('content_hash'));
    } else {
        console.log('No rows found, cannot infer columns from data.');
    }
}

checkSchema();

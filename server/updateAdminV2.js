
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

// Use the provided SERVICE ROLE KEY (temporarily hardcoded for this one-off task as requested)
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbGdodm5tZWdsb3ZpaHZ1YW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTAwNjM2OSwiZXhwIjoyMDg2NTgyMzY5fQ.7pqbaldjKCPOla7PBOfH0Rt-qlCFrpyQZ40bxrPxf6U';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
    console.error("Missing VITE_SUPABASE_URL in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    // Normalize target email to lowercase
    const targetEmail = 'kace5255@gmail.com';
    console.log(`Searching for user: ${targetEmail} (or variants)...`);

    // 1. Check Auth Users (Admin Level) to handle case sensitivity and verify existence
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError);
        return;
    }

    // Find user (case-insensitive check just in case)
    const user = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());

    if (!user) {
        console.error(`User with email "${targetEmail}" NOT FOUND in Auth system.`);
        console.log("Current users found:", users.map(u => u.email));
        return;
    }

    console.log(`Found User ID: ${user.id} (${user.email})`);

    // 2. Upsert Profile
    // We update the role to 'admin'. Upsert handles creation if missing.
    console.log("Upserting profile with role 'admin'...");

    const { data, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            email: user.email,
            role: 'admin',
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (upsertError) {
        console.error("Upsert Failed:", upsertError);
        if (upsertError.message.includes('column "role" of relation "profiles" does not exist')) {
            console.error("CRITICAL: The 'role' column is missing in 'profiles' table.");
            console.error("Please ensure you ran the ALTER TABLE SQL command.");
        }
    } else {
        console.log("Success! User promoted to admin.");
        console.log(`Profile: ${JSON.stringify(data, null, 2)}`);
    }
}

main();

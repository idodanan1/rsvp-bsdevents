#!/usr/bin/env node

/**
 * Script to backup production database
 * This should be run before major deployments
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.production');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backupProduction() {
  console.log('🔄 Starting production backup...\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', timestamp);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    // Backup events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*');

    if (eventsError) throw eventsError;

    fs.writeFileSync(
      path.join(backupDir, 'events.json'),
      JSON.stringify(events, null, 2)
    );
    console.log(`✅ Backed up ${events?.length || 0} events`);

    // Backup guests
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('*');

    if (guestsError) throw guestsError;

    fs.writeFileSync(
      path.join(backupDir, 'guests.json'),
      JSON.stringify(guests, null, 2)
    );
    console.log(`✅ Backed up ${guests?.length || 0} guests`);

    // Backup tables
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*');

    if (tablesError) throw tablesError;

    fs.writeFileSync(
      path.join(backupDir, 'tables.json'),
      JSON.stringify(tables, null, 2)
    );
    console.log(`✅ Backed up ${tables?.length || 0} tables`);

    console.log(`\n✅ Backup completed: ${backupDir}\n`);

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backupProduction();


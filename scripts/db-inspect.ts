#!/usr/bin/env tsx
/**
 * Database Inspection Utility for Cursor AI Development
 * 
 * This script provides CLI-first database introspection commands
 * that allow Cursor to inspect schema, data, and performance without
 * needing to open the Supabase Dashboard.
 * 
 * Usage:
 *   npm run db:inspect table <tablename>
 *   npm run db:inspect query "<sql>"
 *   npm run db:inspect explain "<sql>"
 *   npm run db:inspect rls <tablename>
 *   npm run db:inspect count <tablename>
 *   npm run db:inspect constraints <tablename>
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Database connection URL (local Supabase)
const DB_URL = 'postgresql://postgres:postgres@localhost:54322/postgres';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'bright');
  log('='.repeat(60), 'cyan');
}

async function queryDb(sql: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`psql "${DB_URL}" -c "${sql}"`);
    if (stderr && stderr.includes('ERROR')) {
      throw new Error(stderr);
    }
    return stdout;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
    throw error;
  }
}

async function inspectTable(tableName: string) {
  section(`📊 Table: ${tableName}`);

  // 1. Schema information
  log('\n1️⃣  Schema:', 'yellow');
  const schema = await queryDb(`\\d ${tableName}`);
  console.log(schema);

  // 2. Sample data (first 5 rows)
  log('\n2️⃣  Sample Data (5 rows):', 'yellow');
  try {
    const sample = await queryDb(`SELECT * FROM ${tableName} LIMIT 5;`);
    console.log(sample);
  } catch (error) {
    log(`⚠️  Could not fetch sample data: ${error}`, 'red');
  }

  // 3. Row count
  log('\n3️⃣  Row Count:', 'yellow');
  const count = await queryDb(`SELECT COUNT(*) FROM ${tableName};`);
  console.log(count);

  // 4. Indexes
  log('\n4️⃣  Indexes:', 'yellow');
  const indexes = await queryDb(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = '${tableName}' 
    ORDER BY indexname;
  `);
  console.log(indexes);

  // 5. Constraints
  log('\n5️⃣  Constraints:', 'yellow');
  const constraints = await queryDb(`
    SELECT conname, contype, 
           CASE contype
             WHEN 'p' THEN 'PRIMARY KEY'
             WHEN 'f' THEN 'FOREIGN KEY'
             WHEN 'u' THEN 'UNIQUE'
             WHEN 'c' THEN 'CHECK'
             ELSE contype::text
           END as constraint_type
    FROM pg_constraint 
    WHERE conrelid = '${tableName}'::regclass
    ORDER BY contype, conname;
  `);
  console.log(constraints);

  // 6. RLS Policies
  log('\n6️⃣  RLS Policies:', 'yellow');
  const policies = await queryDb(`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = '${tableName}'
    ORDER BY policyname;
  `);
  console.log(policies);
}

async function inspectRLS(tableName: string) {
  section(`🔒 RLS Policies: ${tableName}`);

  // Check if RLS is enabled
  const rlsEnabled = await queryDb(`
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relname = '${tableName}';
  `);
  log('\nRLS Status:', 'yellow');
  console.log(rlsEnabled);

  // List all policies
  const policies = await queryDb(`
    SELECT 
      policyname,
      permissive,
      roles,
      cmd,
      qual as using_expression,
      with_check as with_check_expression
    FROM pg_policies
    WHERE tablename = '${tableName}'
    ORDER BY policyname;
  `);
  log('\nPolicies:', 'yellow');
  console.log(policies);
}

async function explainQuery(sql: string) {
  section(`⚡ Query Performance Analysis`);
  
  log('\nOriginal Query:', 'yellow');
  console.log(sql);

  log('\n📈 Execution Plan:', 'yellow');
  const plan = await queryDb(`EXPLAIN ANALYZE ${sql}`);
  console.log(plan);
}

async function inspectConstraints(tableName: string) {
  section(`🔗 Constraints: ${tableName}`);

  const constraints = await queryDb(`
    SELECT 
      conname as constraint_name,
      CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::text
      END as constraint_type,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = '${tableName}'::regclass
    ORDER BY contype, conname;
  `);
  console.log(constraints);
}

async function countRows(tableName: string) {
  section(`🔢 Row Count: ${tableName}`);
  
  const count = await queryDb(`
    SELECT 
      COUNT(*) as total_rows,
      pg_size_pretty(pg_total_relation_size('${tableName}'::regclass)) as total_size,
      pg_size_pretty(pg_relation_size('${tableName}'::regclass)) as table_size,
      pg_size_pretty(pg_total_relation_size('${tableName}'::regclass) - pg_relation_size('${tableName}'::regclass)) as indexes_size
    FROM ${tableName};
  `);
  console.log(count);
}

async function listTables() {
  section('📋 All Tables');
  
  const tables = await queryDb(`
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  console.log(tables);
}

async function listFunctions() {
  section('⚙️  All Functions & RPCs');
  
  const functions = await queryDb(`
    SELECT 
      routine_name,
      routine_type,
      data_type as return_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  `);
  console.log(functions);
}

async function inspectFunction(funcName: string) {
  section(`⚙️  Function: ${funcName}`);
  
  const definition = await queryDb(`
    SELECT pg_get_functiondef(oid) as definition
    FROM pg_proc
    WHERE proname = '${funcName}';
  `);
  console.log(definition);
}

async function recentActivity(tableName: string, limit: number = 10) {
  section(`🕐 Recent Activity: ${tableName} (${limit} rows)`);
  
  try {
    // Try to find timestamp columns
    const columns = await queryDb(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      AND (column_name LIKE '%_at' OR column_name LIKE 'timestamp%')
      ORDER BY column_name;
    `);
    
    // Extract column names from output
    const timestampCol = columns.includes('updated_at') ? 'updated_at' : 
                         columns.includes('created_at') ? 'created_at' : null;
    
    if (timestampCol) {
      const recent = await queryDb(`
        SELECT * FROM ${tableName} 
        ORDER BY ${timestampCol} DESC 
        LIMIT ${limit};
      `);
      console.log(recent);
    } else {
      log('⚠️  No timestamp column found (created_at, updated_at)', 'yellow');
      const sample = await queryDb(`SELECT * FROM ${tableName} LIMIT ${limit};`);
      console.log(sample);
    }
  } catch (error) {
    log(`⚠️  Error fetching recent activity: ${error}`, 'red');
  }
}

async function compareSchemas() {
  section('🔄 Local vs Remote Schema Diff');
  
  log('\nGenerating schema diff...', 'yellow');
  try {
    const { stdout } = await execAsync('supabase db diff');
    if (stdout.trim()) {
      console.log(stdout);
    } else {
      log('✅ No schema differences detected', 'green');
    }
  } catch (error) {
    log(`⚠️  Error: ${error}`, 'red');
  }
}

// Main CLI handler
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!command) {
    log('❌ No command provided', 'red');
    log('\nUsage:', 'yellow');
    log('  npm run db:inspect table <tablename>');
    log('  npm run db:inspect query "<sql>"');
    log('  npm run db:inspect explain "<sql>"');
    log('  npm run db:inspect rls <tablename>');
    log('  npm run db:inspect count <tablename>');
    log('  npm run db:inspect constraints <tablename>');
    log('  npm run db:inspect function <funcname>');
    log('  npm run db:inspect recent <tablename> [limit]');
    log('  npm run db:inspect tables');
    log('  npm run db:inspect functions');
    log('  npm run db:inspect diff');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'table':
        if (!args[0]) throw new Error('Table name required');
        await inspectTable(args[0]);
        break;
      
      case 'query':
        if (!args[0]) throw new Error('SQL query required');
        const queryResult = await queryDb(args.join(' '));
        console.log(queryResult);
        break;
      
      case 'explain':
        if (!args[0]) throw new Error('SQL query required');
        await explainQuery(args.join(' '));
        break;
      
      case 'rls':
        if (!args[0]) throw new Error('Table name required');
        await inspectRLS(args[0]);
        break;
      
      case 'count':
        if (!args[0]) throw new Error('Table name required');
        await countRows(args[0]);
        break;
      
      case 'constraints':
        if (!args[0]) throw new Error('Table name required');
        await inspectConstraints(args[0]);
        break;
      
      case 'function':
        if (!args[0]) throw new Error('Function name required');
        await inspectFunction(args[0]);
        break;
      
      case 'recent':
        if (!args[0]) throw new Error('Table name required');
        const limit = args[1] ? parseInt(args[1]) : 10;
        await recentActivity(args[0], limit);
        break;
      
      case 'tables':
        await listTables();
        break;
      
      case 'functions':
        await listFunctions();
        break;
      
      case 'diff':
        await compareSchemas();
        break;
      
      default:
        log(`❌ Unknown command: ${command}`, 'red');
        process.exit(1);
    }
    
    log('\n✅ Done!', 'green');
  } catch (error) {
    log(`\n❌ Error: ${error}`, 'red');
    process.exit(1);
  }
}

main();


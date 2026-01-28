#!/usr/bin/env node
/**
 * Script de observación para el proceso main de Electron
 * Compila TypeScript y renombra .js a .cjs para compatibilidad con ESM
 * 
 * FIX REFERENCE: FIX-20260127-04
 */

import { spawn } from 'child_process';
import { watch, rename, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distElectron = join(rootDir, 'dist-electron');

async function renameJsToCjs(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await renameJsToCjs(fullPath);
      } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.cjs')) {
        const newPath = fullPath.replace(/\.js$/, '.cjs');
        await rename(fullPath, newPath);
        console.log(`[build:main] Renamed: ${entry.name} → ${entry.name.replace('.js', '.cjs')}`);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(err);
  }
}

async function watchAndRename() {
  console.log('[build:main] Watching for .js files in dist-electron...');
  
  // Initial rename
  await renameJsToCjs(distElectron);
  
  // Watch for changes
  const watcher = watch(distElectron, { recursive: true });
  for await (const event of watcher) {
    if (event.filename?.endsWith('.js')) {
      // Small delay to ensure file is fully written
      setTimeout(() => renameJsToCjs(distElectron), 100);
    }
  }
}

// Run initial build
console.log('[build:main] Compiling TypeScript...');
const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.main.json'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

tsc.on('close', async (code) => {
  if (code === 0) {
    console.log('[build:main] Initial compilation complete.');
    await renameJsToCjs(distElectron);
    
    // Start tsc in watch mode
    const tscWatch = spawn('npx', ['tsc', '-w', '-p', 'tsconfig.main.json'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });
    
    // Watch and rename
    watchAndRename();
  } else {
    console.error('[build:main] Compilation failed.');
    process.exit(1);
  }
});

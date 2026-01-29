#!/usr/bin/env node
/**
 * Script de observación para el proceso main de Electron
 * Compila TypeScript en watch mode (salida .js) para compatibilidad CommonJS
 *
 * ID Intervención: FIX-20260128-02
 * Respaldo: context/interconsultas/DICTAMEN_FIX-20260127-04.md
 */

import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = `${__dirname}/..`;

// Run initial build
console.log('[build:main] Compiling TypeScript (main)...');
const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.main.json'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

tsc.on('close', async (code) => {
  if (code === 0) {
    console.log('[build:main] Initial compilation complete.');
    
    // Start tsc in watch mode
    spawn('npx', ['tsc', '-w', '-p', 'tsconfig.main.json'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });
  } else {
    console.error('[build:main] Compilation failed.');
    process.exit(1);
  }
});

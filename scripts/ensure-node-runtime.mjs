#!/usr/bin/env node

const requiredMajor = 22;
const current = process.versions.node;
const currentMajor = Number.parseInt(current.split('.')[0] ?? '0', 10);

if (currentMajor !== requiredMajor) {
  console.error(`\n❌ Unsupported Node.js runtime: ${current}`);
  console.error(`   This project requires Node.js ${requiredMajor}.x (see .nvmrc).`);
  console.error('   Run: nvm use\n');
  process.exit(1);
}

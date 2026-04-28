#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const write = process.argv.includes('--write');
const root = process.cwd();
const stateRoot = path.join(root, '.omx', 'state');
const now = new Date().toISOString();
const staleMs = Number.parseInt(process.env.OMX_STATE_PRUNE_STALE_MS ?? `${24 * 60 * 60 * 1000}`, 10);

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectSkillStateFiles() {
  const files = [path.join(stateRoot, 'skill-active-state.json')];
  const sessionsDir = path.join(stateRoot, 'sessions');

  if (!(await fileExists(sessionsDir))) {
    return files;
  }

  const sessionEntries = await fs.readdir(sessionsDir, { withFileTypes: true });
  for (const entry of sessionEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    files.push(path.join(sessionsDir, entry.name, 'skill-active-state.json'));
  }

  return files;
}

async function collectInstalledSkillNames() {
  const names = new Set();
  const roots = [
    path.join(root, '.codex', 'skills'),
    path.join(process.env.HOME ?? '', '.codex', 'skills'),
  ];

  for (const skillsRoot of roots) {
    if (!skillsRoot || !(await fileExists(skillsRoot))) {
      continue;
    }

    const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillFile = path.join(skillsRoot, entry.name, 'SKILL.md');
      if (!(await fileExists(skillFile))) {
        continue;
      }

      const raw = await fs.readFile(skillFile, 'utf8');
      const match = raw.match(/^name:\s*"?([^"\n]+)"?\s*$/m);
      if (match) {
        names.add(match[1].trim());
      }
    }
  }

  return names;
}

function isOlderThanStaleWindow(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) && Date.now() - timestamp > staleMs;
}

function shouldPruneSkillState(state) {
  if (!state || typeof state !== 'object') {
    return false;
  }

  const activeSkills = Array.isArray(state.active_skills) ? state.active_skills : [];
  return state.active === false
    && activeSkills.length === 0
    && Boolean(state.skill || state.keyword || (state.phase && state.phase !== 'inactive'));
}

function shouldPruneUnknownStaleSkillState(state, installedSkills) {
  if (!state || typeof state !== 'object' || state.active !== true) {
    return false;
  }

  const activeSkills = Array.isArray(state.active_skills) ? state.active_skills : [];
  const stateSkill = typeof state.skill === 'string' ? state.skill : '';
  const skillNames = activeSkills
    .map((entry) => (entry && typeof entry.skill === 'string' ? entry.skill : ''))
    .filter(Boolean);
  const names = new Set([stateSkill, ...skillNames].filter(Boolean));

  if (names.size === 0 || [...names].some((name) => installedSkills.has(name))) {
    return false;
  }

  const updatedAt = state.updated_at ?? activeSkills[0]?.updated_at;
  return isOlderThanStaleWindow(updatedAt);
}

function prunedSkillState(state) {
  return {
    version: state.version ?? 1,
    active: false,
    phase: 'inactive',
    updated_at: now,
    source: 'prune-omx-state',
    active_skills: [],
  };
}

let pruned = 0;
let checked = 0;
const installedSkills = await collectInstalledSkillNames();

for (const filePath of await collectSkillStateFiles()) {
  if (!(await fileExists(filePath))) {
    continue;
  }

  checked += 1;
  const raw = await fs.readFile(filePath, 'utf8');
  const state = JSON.parse(raw);

  if (!shouldPruneSkillState(state) && !shouldPruneUnknownStaleSkillState(state, installedSkills)) {
    continue;
  }

  pruned += 1;
  if (write) {
    await fs.writeFile(filePath, `${JSON.stringify(prunedSkillState(state), null, 2)}\n`);
  }
}

console.log(JSON.stringify({ checked, pruned, write }));

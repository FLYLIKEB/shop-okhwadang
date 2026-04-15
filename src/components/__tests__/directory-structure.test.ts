/**
 * Directory Structure Test - Issue #398 Phase 1
 *
 * This test verifies the component directory structure follows the architecture:
 * - src/components/shared/ - locale-agnostic components
 * - src/components/ko/ - Korean-specific components
 * - src/components/en/ - English-specific components (placeholder)
 *
 * Rules:
 * - ko/ and en/ can import from shared/
 * - shared/ cannot import from ko/ or en/
 * - ko/ and en/ cannot import from each other
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const COMPONENTS_DIR = path.join(process.cwd(), 'src/components');
const SHARED_DIR = path.join(COMPONENTS_DIR, 'shared');
const KO_DIR = path.join(COMPONENTS_DIR, 'ko');
const EN_DIR = path.join(COMPONENTS_DIR, 'en');

// Expected shared subdirectories
const EXPECTED_SHARED_SUBDIRS = [
  'hooks',
  'layout',
  'home',
  'cart',
  'checkout',
  'admin',
  'blocks',
  'common',
  'contexts',
  'filters',
  'journal',
  'products',
  'reviews',
  'auth',
  'search',
];

// Files that should exist in ko/ directory
const EXPECTED_KO_FILES = ['Header.tsx', 'Footer.tsx'];

describe('Directory Structure - Issue #398 Phase 1', () => {
  describe('shared/ directory', () => {
    it('should exist', () => {
      expect(fs.existsSync(SHARED_DIR)).toBe(true);
    });

    it('should have expected subdirectories', () => {
      if (!fs.existsSync(SHARED_DIR)) {
        // Skip subdirectory checks if shared doesn't exist
        return;
      }

      const actualDirs = fs.readdirSync(SHARED_DIR).filter((d) => {
        return fs.statSync(path.join(SHARED_DIR, d)).isDirectory();
      });

      for (const expectedDir of EXPECTED_SHARED_SUBDIRS) {
        expect(actualDirs).toContain(expectedDir);
      }
    });
  });

  describe('ko/ directory', () => {
    it('should exist', () => {
      expect(fs.existsSync(KO_DIR)).toBe(true);
    });

    it('should contain Header.tsx and Footer.tsx', () => {
      if (!fs.existsSync(KO_DIR)) {
        return;
      }

      const files = fs.readdirSync(KO_DIR).filter((f) => f.endsWith('.tsx'));
      for (const expectedFile of EXPECTED_KO_FILES) {
        expect(files).toContain(expectedFile);
      }
    });
  });

  describe('en/ directory', () => {
    it('should exist', () => {
      expect(fs.existsSync(EN_DIR)).toBe(true);
    });

    it('should have placeholder content or home directory', () => {
      if (!fs.existsSync(EN_DIR)) {
        return;
      }

      const contents = fs.readdirSync(EN_DIR);
      // en/ should either have a home/ directory or a .gitkeep file
      const hasHomeDir = contents.includes('home');
      const hasGitkeep = contents.includes('.gitkeep');
      expect(hasHomeDir || hasGitkeep).toBe(true);
    });
  });

  describe('Component file locations', () => {
    // These tests verify that specific files have been moved to their correct locations

    const COMPONENT_MOVES = [
      // Files that should be in shared/
      { file: 'EmptyState.tsx', expectedDir: SHARED_DIR },
      { file: 'BackButton.tsx', expectedDir: SHARED_DIR },
      { file: 'WishlistButton.tsx', expectedDir: SHARED_DIR },
      { file: 'Logo.tsx', expectedDir: SHARED_DIR },
      { file: 'LanguageSelector.tsx', expectedDir: SHARED_DIR },
      { file: 'MobileBottomNav.tsx', expectedDir: SHARED_DIR },
      { file: 'MobileBottomNavWrapper.tsx', expectedDir: SHARED_DIR },
      { file: 'PageTransition.tsx', expectedDir: SHARED_DIR },
      { file: 'Providers.tsx', expectedDir: SHARED_DIR },
      { file: 'RecentlyViewedWidget.tsx', expectedDir: SHARED_DIR },
      { file: 'ShippingTimeline.tsx', expectedDir: SHARED_DIR },
      { file: 'ErrorFallback.tsx', expectedDir: SHARED_DIR },
      // Files that should be in ko/
      { file: 'Header.tsx', expectedDir: KO_DIR },
      { file: 'Footer.tsx', expectedDir: KO_DIR },
    ];

    for (const { file, expectedDir } of COMPONENT_MOVES) {
      it(`should have ${file} in correct location`, () => {
        const expectedPath = path.join(expectedDir, file);
        expect(fs.existsSync(expectedPath)).toBe(true);
      });
    }
  });

  describe('Subdirectory component locations', () => {
    const SUBDIR_COMPONENTS = [
      { dir: 'layout', file: 'AnnouncementBar.tsx' },
      { dir: 'layout', file: 'Breadcrumb.tsx' },
      { dir: 'layout', file: 'CategoryHeroBanner.tsx' },
      { dir: 'home', file: 'CountdownTimer.tsx' },
      { dir: 'cart', file: 'CartItemRow.tsx' },
      { dir: 'checkout', file: 'AddressSelectorSection.tsx' },
      { dir: 'checkout', file: 'PaymentGateway.tsx' },
      { dir: 'admin', file: 'AdminMembersTable.tsx' },
      { dir: 'admin', file: 'AdminOrdersTable.tsx' },
      { dir: 'blocks', file: 'BlockRenderer.tsx' },
      { dir: 'blocks', file: 'HeroBannerBlock.tsx' },
      { dir: 'common', file: 'PriceDisplay.tsx' },
      { dir: 'contexts', file: 'LogoScrollContext.tsx' },
      { dir: 'filters', file: 'FilterSidebar.tsx' },
      { dir: 'journal', file: 'JournalListClient.tsx' },
      { dir: 'products', file: 'ProductCard.tsx' },
      { dir: 'products', file: 'ProductGrid.tsx' },
      { dir: 'reviews', file: 'ReviewCard.tsx' },
      { dir: 'reviews', file: 'ReviewForm.tsx' },
      { dir: 'auth', file: 'LoginForm.tsx' },
      { dir: 'auth', file: 'RegisterForm.tsx' },
      { dir: 'search', file: 'SearchInput.tsx' },
    ];

    for (const { dir, file } of SUBDIR_COMPONENTS) {
      it(`should have ${dir}/${file} in shared/`, () => {
        const expectedPath = path.join(SHARED_DIR, dir, file);
        expect(fs.existsSync(expectedPath)).toBe(true);
      });
    }
  });

  describe('Hooks directory', () => {
    it('should have hooks moved to shared/hooks/', () => {
      const hooksDir = path.join(SHARED_DIR, 'hooks');
      expect(fs.existsSync(hooksDir)).toBe(true);

      if (!fs.existsSync(hooksDir)) {
        return;
      }

      const hookFiles = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.ts'));
      // Check some expected hooks
      expect(hookFiles).toContain('useNavigation.ts');
      expect(hookFiles).toContain('useCheckout.ts');
    });
  });

  describe('Import path restrictions', () => {
    it('should not allow imports from ko/ or en/ in shared/ files', () => {
      // This is enforced by ESLint import/no-restricted-paths rule
      // We verify the rule is configured in eslint.config.js
      const eslintConfigPath = path.join(process.cwd(), 'eslint.config.js');
      expect(fs.existsSync(eslintConfigPath)).toBe(true);

      const eslintContent = fs.readFileSync(eslintConfigPath, 'utf-8');
      expect(eslintContent).toContain('import/no-restricted-paths');
    });
  });
});
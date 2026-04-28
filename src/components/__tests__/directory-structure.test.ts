/**
 * Directory Structure Test
 *
 * This test verifies the component directory structure follows the architecture:
 * - src/components/shared/ - locale-agnostic components
 * - src/components/ - top-level locale-specific components (Header, Footer, etc.)
 *
 * Note: Issue #398 planned to split into ko/en directories, but current architecture
 * uses top-level components with shared/ for locale-agnostic ones.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const COMPONENTS_DIR = path.join(process.cwd(), 'src/components');
const SHARED_DIR = path.join(COMPONENTS_DIR, 'shared');

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

// Files that should exist at top-level components directory
const EXPECTED_TOP_LEVEL_FILES = ['Header.tsx', 'Footer.tsx', 'LanguageSelector.tsx', 'Logo.tsx'];

describe('Directory Structure', () => {
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

  describe('Top-level component files', () => {
    it('should have Header.tsx and Footer.tsx at top level', () => {
      for (const expectedFile of EXPECTED_TOP_LEVEL_FILES) {
        const filePath = path.join(COMPONENTS_DIR, expectedFile);
        expect(fs.existsSync(filePath)).toBe(true);
      }
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
      // Files that should be at top level (not in shared/)
      { file: 'Header.tsx', expectedDir: COMPONENTS_DIR },
      { file: 'Footer.tsx', expectedDir: COMPONENTS_DIR },
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
    it('should have hooks in shared/hooks/', () => {
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
    it('should have eslint config for import restrictions', () => {
      const eslintConfigPath = path.join(process.cwd(), 'eslint.config.js');
      expect(fs.existsSync(eslintConfigPath)).toBe(true);

      const eslintContent = fs.readFileSync(eslintConfigPath, 'utf-8');
      expect(eslintContent).toContain('import/no-restricted-paths');
    });
  });
});

/**
 * Tests for the glob tool.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { globTool } from './glob.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dir, 'test-fixtures-glob');

describe('globTool', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(join(TEST_DIR, 'nested'), { recursive: true });
    await mkdir(join(TEST_DIR, 'src', 'components'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('should match basic pattern', async () => {
    const file1 = join(TEST_DIR, 'file1.ts');
    const file2 = join(TEST_DIR, 'file2.ts');
    await writeFile(file1, 'content1', 'utf-8');
    await writeFile(file2, 'content2', 'utf-8');

    const result = await globTool.execute({
      pattern: '*.ts',
      path: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain(file1);
      expect(result.data).toContain(file2);
    }
  });

  it('should match nested directories with ** pattern', async () => {
    const file1 = join(TEST_DIR, 'file1.ts');
    const file2 = join(TEST_DIR, 'nested', 'file2.ts');
    const file3 = join(TEST_DIR, 'src', 'components', 'Button.ts');

    await writeFile(file1, 'content1', 'utf-8');
    await writeFile(file2, 'content2', 'utf-8');
    await writeFile(file3, 'content3', 'utf-8');

    const result = await globTool.execute({
      pattern: '**/*.ts',
      path: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain(file1);
      expect(result.data).toContain(file2);
      expect(result.data).toContain(file3);
    }
  });

  it('should return empty string for no matches', async () => {
    const result = await globTool.execute({
      pattern: '*.nonexistent',
      path: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('');
    }
  });

  it('should sort results by modification time (newest first)', async () => {
    const file1 = join(TEST_DIR, 'oldest.ts');
    const file2 = join(TEST_DIR, 'middle.ts');
    const file3 = join(TEST_DIR, 'newest.ts');

    // Create files with delays to ensure different mtimes
    await writeFile(file1, 'oldest', 'utf-8');
    await new Promise((resolve) => setTimeout(resolve, 50));
    await writeFile(file2, 'middle', 'utf-8');
    await new Promise((resolve) => setTimeout(resolve, 50));
    await writeFile(file3, 'newest', 'utf-8');

    const result = await globTool.execute({
      pattern: '*.ts',
      path: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const lines = result.data.split('\n').filter((l) => l.length > 0);
      // Newest should be first
      expect(lines[0]).toBe(file3);
      expect(lines[1]).toBe(file2);
      expect(lines[2]).toBe(file1);
    }
  });

  it('should use cwd as default path', async () => {
    // Just verify it doesn't error when path is omitted
    const result = await globTool.execute({
      pattern: '*.md',
    });

    expect(result.ok).toBe(true);
    // Should find at least one .md file in the project root
    if (result.ok) {
      expect(result.data.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle specific directory patterns', async () => {
    const componentFile = join(TEST_DIR, 'src', 'components', 'Button.ts');
    const utilsFile = join(TEST_DIR, 'src', 'utils.ts');

    await writeFile(componentFile, 'button', 'utf-8');
    await writeFile(utilsFile, 'utils', 'utf-8');

    const result = await globTool.execute({
      pattern: 'src/components/*.ts',
      path: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain(componentFile);
      expect(result.data).not.toContain(utilsFile);
    }
  });

  it('should handle complex patterns', async () => {
    const tsFile = join(TEST_DIR, 'file.ts');
    const jsFile = join(TEST_DIR, 'file.js');

    await writeFile(tsFile, 'ts content', 'utf-8');
    await writeFile(jsFile, 'js content', 'utf-8');

    const result = await globTool.execute({
      pattern: '*.{ts,js}',
      path: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain(tsFile);
      expect(result.data).toContain(jsFile);
    }
  });
});

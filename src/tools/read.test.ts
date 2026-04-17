/**
 * Tests for the read tool.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { readTool } from './read.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dir, 'test-fixtures');

describe('readTool', () => {
  beforeEach(async () => {
    // Create test directory
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('should read a file with line numbers', async () => {
    const filePath = join(TEST_DIR, 'test.txt');
    await writeFile(filePath, 'Line 1\nLine 2\nLine 3', 'utf-8');

    const result = await readTool.execute({ filePath });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('1: Line 1\n2: Line 2\n3: Line 3');
    }
  });

  it('should handle offset parameter', async () => {
    const filePath = join(TEST_DIR, 'test.txt');
    await writeFile(filePath, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5', 'utf-8');

    const result = await readTool.execute({ filePath, offset: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('3: Line 3\n4: Line 4\n5: Line 5');
    }
  });

  it('should handle limit parameter', async () => {
    const filePath = join(TEST_DIR, 'test.txt');
    await writeFile(filePath, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5', 'utf-8');

    const result = await readTool.execute({ filePath, limit: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('1: Line 1\n2: Line 2');
    }
  });

  it('should handle offset and limit together', async () => {
    const filePath = join(TEST_DIR, 'test.txt');
    await writeFile(filePath, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5', 'utf-8');

    const result = await readTool.execute({ filePath, offset: 2, limit: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('2: Line 2\n3: Line 3');
    }
  });

  it('should return error for missing file', async () => {
    const filePath = join(TEST_DIR, 'nonexistent.txt');

    const result = await readTool.execute({ filePath });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FILE_NOT_FOUND');
    }
  });

  it('should list directory entries', async () => {
    const filePath = join(TEST_DIR, 'test.txt');
    await writeFile(filePath, 'content', 'utf-8');
    await mkdir(join(TEST_DIR, 'subdir'), { recursive: true });

    const result = await readTool.execute({ filePath: TEST_DIR });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('test.txt');
      expect(result.data).toContain('subdir/');
    }
  });

  it('should detect binary files', async () => {
    const filePath = join(TEST_DIR, 'binary.bin');
    // Create content with >30% non-printable chars
    const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09]);
    await writeFile(filePath, binaryContent);

    const result = await readTool.execute({ filePath });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Binary file not supported');
    }
  });

  it('should handle empty files', async () => {
    const filePath = join(TEST_DIR, 'empty.txt');
    await writeFile(filePath, '', 'utf-8');

    const result = await readTool.execute({ filePath });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('1: ');
    }
  });

  it('should handle files with trailing newline', async () => {
    const filePath = join(TEST_DIR, 'test.txt');
    await writeFile(filePath, 'Line 1\nLine 2\n', 'utf-8');

    const result = await readTool.execute({ filePath });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('1: Line 1\n2: Line 2\n3: ');
    }
  });
});

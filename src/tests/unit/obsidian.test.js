const ObsidianIntegration = require('../../utils/obsidian');
const fs = require('fs').promises;
const path = require('path');

// モックの設定
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn()
  }
}));

describe('ObsidianIntegration', () => {
  let obsidian;
  const mockVaultPath = '/path/to/vault';

  beforeEach(() => {
    obsidian = new ObsidianIntegration(mockVaultPath);
    jest.clearAllMocks();
  });

  describe('createNote', () => {
    test('should create a note with correct format', async () => {
      const title = 'Test Note';
      const content = 'Test content';
      const tags = ['test', 'example'];

      await obsidian.createNote(title, content, tags);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockVaultPath, `${title}.md`),
        expect.stringContaining(title),
        'utf8'
      );
    });

    test('should handle errors during note creation', async () => {
      const error = new Error('Write failed');
      fs.writeFile.mockRejectedValueOnce(error);

      await expect(obsidian.createNote('Test', 'Content')).rejects.toThrow('Write failed');
    });
  });

  describe('updateNote', () => {
    test('should update existing note', async () => {
      const title = 'Test Note';
      const content = 'Updated content';
      const existingContent = '---\ntitle: Test Note\ndate: 2024-01-01\n---\n\nOld content';

      fs.readFile.mockResolvedValueOnce(existingContent);

      await obsidian.updateNote(title, content);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockVaultPath, `${title}.md`),
        expect.stringContaining(content),
        'utf8'
      );
    });

    test('should handle errors during note update', async () => {
      const error = new Error('Read failed');
      fs.readFile.mockRejectedValueOnce(error);

      await expect(obsidian.updateNote('Test', 'Content')).rejects.toThrow('Read failed');
    });
  });

  describe('searchNotes', () => {
    test('should find notes containing search query', async () => {
      const files = ['note1.md', 'note2.md'];
      const content1 = 'Test content';
      const content2 = 'Different content';

      fs.readdir.mockResolvedValueOnce(files);
      fs.readFile
        .mockResolvedValueOnce(content1)
        .mockResolvedValueOnce(content2);

      const results = await obsidian.searchNotes('Test');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('note1');
    });

    test('should return empty array when no matches found', async () => {
      fs.readdir.mockResolvedValueOnce(['note1.md']);
      fs.readFile.mockResolvedValueOnce('Different content');

      const results = await obsidian.searchNotes('Test');

      expect(results).toHaveLength(0);
    });
  });

  describe('getTags', () => {
    test('should extract unique tags from notes', async () => {
      const files = ['note1.md', 'note2.md'];
      const content1 = '---\ntags: tag1, tag2\n---\n';
      const content2 = '---\ntags: tag2, tag3\n---\n';

      fs.readdir.mockResolvedValueOnce(files);
      fs.readFile
        .mockResolvedValueOnce(content1)
        .mockResolvedValueOnce(content2);

      const tags = await obsidian.getTags();

      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    test('should return empty array when no tags found', async () => {
      fs.readdir.mockResolvedValueOnce(['note1.md']);
      fs.readFile.mockResolvedValueOnce('No tags here');

      const tags = await obsidian.getTags();

      expect(tags).toHaveLength(0);
    });
  });
}); 
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

class ObsidianIntegration {
  constructor(vaultPath) {
    this.vaultPath = vaultPath;
  }

  // ノートの作成
  async createNote(title, content, tags = []) {
    try {
      const fileName = `${title}.md`;
      const filePath = path.join(this.vaultPath, fileName);
      
      const noteContent = `---
title: ${title}
date: ${new Date().toISOString()}
tags: ${tags.join(', ')}
---

${content}
`;

      await fs.writeFile(filePath, noteContent, 'utf8');
      logger.info('Note created successfully', { title, filePath });
      return { success: true, filePath };
    } catch (error) {
      logger.error('Failed to create note', { error, title });
      throw error;
    }
  }

  // ノートの更新
  async updateNote(title, content) {
    try {
      const fileName = `${title}.md`;
      const filePath = path.join(this.vaultPath, fileName);
      
      const existingContent = await fs.readFile(filePath, 'utf8');
      const updatedContent = existingContent.replace(
        /---\n[\s\S]*?\n---\n\n/,
        `---\ntitle: ${title}\ndate: ${new Date().toISOString()}\n---\n\n`
      ) + content;

      await fs.writeFile(filePath, updatedContent, 'utf8');
      logger.info('Note updated successfully', { title, filePath });
      return { success: true, filePath };
    } catch (error) {
      logger.error('Failed to update note', { error, title });
      throw error;
    }
  }

  // ノートの検索
  async searchNotes(query) {
    try {
      const files = await fs.readdir(this.vaultPath);
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      
      const results = [];
      for (const file of markdownFiles) {
        const content = await fs.readFile(path.join(this.vaultPath, file), 'utf8');
        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            title: file.replace('.md', ''),
            path: path.join(this.vaultPath, file)
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Failed to search notes', { error, query });
      throw error;
    }
  }

  // タグの取得
  async getTags() {
    try {
      const files = await fs.readdir(this.vaultPath);
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      
      const tags = new Set();
      for (const file of markdownFiles) {
        const content = await fs.readFile(path.join(this.vaultPath, file), 'utf8');
        const tagMatch = content.match(/tags: (.*)/);
        if (tagMatch) {
          tagMatch[1].split(',').forEach(tag => tags.add(tag.trim()));
        }
      }
      
      return Array.from(tags);
    } catch (error) {
      logger.error('Failed to get tags', { error });
      throw error;
    }
  }
}

module.exports = ObsidianIntegration; 
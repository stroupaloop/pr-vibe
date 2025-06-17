/**
 * Base Provider Interface
 * All git providers must implement these methods
 */
export class BaseProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * Get PR details
   * @returns {Promise<{title, author, description, state}>}
   */
  async getPullRequest(id) {
    throw new Error('getPullRequest must be implemented by provider');
  }

  /**
   * Get all comments (issue + review comments)
   * @returns {Promise<Array<{id, author, body, path?, line?, createdAt}>>}
   */
  async getComments(prId) {
    throw new Error('getComments must be implemented by provider');
  }

  /**
   * Post a comment reply
   * @returns {Promise<{id, url}>}
   */
  async postComment(prId, commentId, body, isInline = false) {
    throw new Error('postComment must be implemented by provider');
  }

  /**
   * Apply a fix by creating a commit
   * @returns {Promise<{sha, message}>}
   */
  async applyFix(prId, changes) {
    throw new Error('applyFix must be implemented by provider');
  }

  /**
   * Get file contents
   * @returns {Promise<string>}
   */
  async getFileContent(prId, path) {
    throw new Error('getFileContent must be implemented by provider');
  }

  /**
   * Update PR labels
   * @returns {Promise<void>}
   */
  async updateLabels(prId, labels) {
    throw new Error('updateLabels must be implemented by provider');
  }
}
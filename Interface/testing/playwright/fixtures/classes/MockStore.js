export default class MockStore {
  constructor(apiMocks) {
    this.apiMocks = apiMocks;
    this.snapshots = new Map();
  }

  /**
   * Save current mock state
   */
  async save(name = 'default') {
    // Get all current mocks from apiMocks
    const mocks = this.apiMocks.getAllMocks ? this.apiMocks.getAllMocks() : {};
    
    this.snapshots.set(name, {
      name,
      timestamp: Date.now(),
      mocks
    });
    return this.snapshots.get(name);
  }

  /**
   * Restore a saved snapshot
   */
  async restore(name = 'default') {
    const snapshot = this.snapshots.get(name);
    if (!snapshot) {
      throw new Error(`Snapshot "${name}" not found`);
    }
    
    await this.apiMocks.clearAllMocks();
    
    // Re-apply saved mocks
    for (const [endpoint, data] of Object.entries(snapshot.mocks)) {
      await this.apiMocks.mockGet(endpoint, data);
    }
  }

  /**
   * Get a snapshot by name
   */
  get(name = 'default') {
    return this.snapshots.get(name);
  }

  /**
   * List all saved snapshots
   */
  list() {
    return Array.from(this.snapshots.keys()).map(name => ({
      name,
      timestamp: this.snapshots.get(name).timestamp
    }));
  }

  /**
   * Delete a snapshot
   */
  async delete(name) {
    this.snapshots.delete(name);
  }
}
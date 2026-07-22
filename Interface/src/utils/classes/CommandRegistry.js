import MiniSubject from './MiniSubject';

class CommandRegistry {
  constructor() {
    this.map = new Map();
    this.onRegistryChange = new MiniSubject();
  }

  register(id, handler) {
    this.map.set(id, handler);
    this.onRegistryChange.next({ type: 'register', id });
    return () => this.unregister(id);
  }

  unregister(id) {
    this.map.delete(id);
    this.onRegistryChange.next({ type: 'unregister', id });
  }

  isRegistered(id) {
    return this.map.has(id);
  }

  execute(id, ...args) {
    const fn = this.map.get(id);
    if (fn) return fn(...args);
  }
}

export const printCommandRegistry = new CommandRegistry();

export const closeCommandRegistry = new CommandRegistry();

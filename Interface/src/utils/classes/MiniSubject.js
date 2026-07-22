class MiniSubject {
  constructor() {
    this.subs = new Set();
  }

  subscribe(fn) {
    this.subs.add(fn);
    return () => this.subs.delete(fn); // unsubscribe
  }

  next(value) {
    for (const fn of this.subs) fn(value);
  }
}

export default MiniSubject;

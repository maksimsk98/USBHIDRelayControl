class TickGenerator {
  constructor() {
    this.cache = new Map();
  }

  getTicks(rangeEndSec, timeUnit, rangeStart = 0) {
    const key = `${rangeStart}_${rangeEndSec}_${timeUnit}`;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const [vals, texts] = this._generate(rangeStart, rangeEndSec, timeUnit);

    const result = [Object.freeze([...vals]), Object.freeze([...texts])];

    this.cache.set(key, result);
    return result;
  }

  _generate(rangeStart, rangeEnd, timeUnit) {
    if (!rangeEnd || !isFinite(rangeEnd)) return [[], []];

    const divisions = timeUnit === 'min' ? 20 : 30;
    const increment = (rangeEnd - rangeStart) / divisions || 1;

    const vals = [];
    const texts = [];

    for (let i = rangeStart; i <= rangeEnd + increment / 2; i += increment) {
      vals.push(i);
      const label = timeUnit === 'min' ? (i / 60).toFixed(2) : i.toFixed(1);
      texts.push(label);
    }

    return [vals, texts];
  }
}

export const tickGenerator = new TickGenerator();

class FileIdGenerator {
  constructor() {
    this.noHashCounter = 0;
    this.defaultName = 'namelessFile';
  }

  getNoName() {
    return this.defaultName;
  }

  getId(name, hash) {
    const rawName = (typeof name === 'string' && name.length) ? name : this.defaultName;
    const nameForId = rawName.normalize('NFC');
    if (hash) return `${nameForId}_${hash}`;

    this.noHashCounter += 1;
    return `${nameForId}_nohash#${this.noHashCounter}`;
  }

  getNextNoHash() {
    this.noHashCounter += 1;
    return `nohash#${this.noHashCounter}`;
  }

  reset() {
    this.noHashCounter = 0;
  }
}

const fileIdGenerator = new FileIdGenerator();

module.exports = { FileIdGenerator, fileIdGenerator };

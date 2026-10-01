module.exports = class Widget {
  constructor(controller, parameter = {}) {
    this.controller = controller;
    this.ctx = controller.ctx;
    this.parameter = parameter;
    this.stack = [];
    this.row = {};
    this.sequence = 0;
    this.length = 0;
    this.fieldAccessors = {};
  }

  async init() {}

  async execute() {}

  model(name) {
    return this.controller.model(name);
  }

  fieldAccessor(name, formatter = value => value) {
    if (!this.fieldAccessors[name]) {
      const accessor = (...args) => formatter.call(this, this.row[name], ...args);
      accessor.val = () => this.row[name];
      this.fieldAccessors[name] = accessor;
    }
    return this.fieldAccessors[name];
  }

  push(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Widget rows must be objects');
    }

    this.row = value;
    this.stack.push(value);
    this.length = this.stack.length;
    this.defineRowProperties(value);
    return value;
  }

  pushAll(values) {
    if (!Array.isArray(values)) {
      throw new TypeError('Widget rows must be an array');
    }
    values.forEach(value => this.push(value));
  }

  defineRowProperties(value) {
    Object.keys(value).forEach(key => {
      if (key in this) {
        return;
      }
      Object.defineProperty(this, key, {
        configurable: true,
        enumerable: true,
        get: () => this.row[key]
      });
    });
  }

  next() {
    if (this.sequence < this.stack.length) {
      this.row = this.stack[this.sequence];
      this.sequence += 1;
      this.defineRowProperties(this.row);
      return this.row;
    }

    this.sequence = 0;
    this.row = {};
    return false;
  }

  have() {
    return this.stack.length > 0;
  }

  alt(...values) {
    return this.altBy(this.sequence, ...values);
  }

  altBy(current, ...values) {
    if (!values.length) return '';
    const index = (current % values.length || values.length) - 1;
    return values[index];
  }

  toColumn(column) {
    if (Array.isArray(column)) {
      return column.reduce((result, key) => {
        result[key] = this.row[key];
        return result;
      }, {});
    }
    if (typeof column === 'undefined') {
      return this.row;
    }
    return this.row[column];
  }

  toArray(column) {
    const result = [];
    while (this.next()) {
      result.push(this.toColumn(column));
    }
    return result;
  }

  template(template) {
    return String(template).replace(/\{([_a-z0-9]+)\}/ig, (match, key) => {
      const value = this.row[key];
      return value === null || typeof value === 'undefined' ? '' : value;
    });
  }

  parse(template) {
    let result = '';
    while (this.next()) {
      result += this.template(template);
    }
    return result;
  }
};

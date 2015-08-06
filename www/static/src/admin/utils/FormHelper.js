import React from 'react';

import autobind from 'autobind-decorator';


@autobind
class formHelper {
  constructor(context, stateProp = '') {
    this.context = context;
    this.stateProps = stateProp.split('.');
  }

  get state() {
    return this.stateProps.filter(Boolean).reduce(
        (object, key) => object[key],
        this.context.state
    );
  }

  setState(key, value) {
    this.state[key] = value;
    this.context.setState(this.context.state);
  }

  buildBlocks(config) {
    return config.map(this.buildBlock);
  }

  buildBlock(block) {

    let hint = block.hint ? (
        <span className="hint block-hint">{ block.hint }</span>
    ) : '';

    if (!block.global) {
      block.fields.forEach(field => field.id = `${block.id}_${field.id}`);
    }

    let fields = this.buildFields(block.fields, block);

    return (
        <div className="block" key={ block.id }>
          <div className="title">
            <h3>{ block.name }</h3>
            { hint }
          </div>
          <div className="content">
            { fields }
          </div>
        </div>
    );
  }

  buildFields(config) {
    return config.map(this.buildField);
  }

  buildField(field) {
    let hint = field.hint ? (
        <span className="hint">{ field.hint }</span>
    ) : '';

    return (
        <div className="field" key={ field.id }>
          <label htmlFor={ field.id } >{ field.name }</label>
          { this.buildInput(field) }
          { hint }
        </div>
    )
  }

  buildInput(field) {
    switch (field.type) {
      case 'radio':
        return this.buildRadio(field);
      case 'checkbox':
        return this.buildCheckbox(field);
      case 'select':
        return this.buildSelect(field);
      case 'textarea':
        return this.buildTextarea(field);
      case 'hint':
        return this.buildHints(field);
      default:
        return this.buildText(field);
    }
  }

  buildText(field) {
    return (
        <input
            id={ field.id }
            className="text"
            type={ field.type || 'text' }
            placeholder={ field.placeholder || '' }
            value={ this.state[field.id] }
            onChange={ this.handleChange.bind(this, field.id) }
            />
    );
  }

  buildTextarea(field) {
    return (
        <textarea
            id={ field.id }
            cols="30"
            rows="10"
            placeholder={ field.placeholder || '' }
            value={ this.state[field.id] }
            onChange={ this.handleChange.bind(this, field.id) }
            />
    );
  }

  buildRadio(field) {
    let options = parseOptions(field.options)
        .map((option, i) => (
            <label key={i}>
              <input
                  type="radio"
                  name={ field.id }
                  value={ option.value }
                  checked={ String(option.value) == this.state[field.id] }
                  onChange={ this.handleChange.bind(this, field.id) }
                  />
              { option.name }
            </label>
        ));

    return (
        <span className="input-wrapper">
        { options }
      </span>
    );
  }

  buildCheckbox(field) {
    if (field.options) {

      let options = parseOptions(field.options)
          .map((option, i) => {
            let id = `${field.id}_${option.value}`;
            return (
                <label key={i}>
                  <input
                      type="checkbox"
                      checked={ this.state[id] == 'true' }
                      onChange={ this.handleChange.bind(this, id) }
                      />
                  { option.name }
                </label>
            );
          });

      return (
          <span className="input-wrapper">
          { options }
        </span>
      );
    } else {
      let newField = Object.assign({}, field, {
        options: {
          '开启': true,
          '关闭': false
        }
      });
      return this.buildRadio(newField);
    }
  }

  buildSelect(field) {
    let options = parseOptions(field.options)
        .map((option, i) => (
            <option value={ option.value } key={i} >
              { option.name }
            </option>
        ));

    return (
        <select id={ field.id }>
          { options }
        </select>
    )
  }

  buildHints(fields) {
    return (
        <pre className="input-hint">{ fields.value }</pre>
    )
  }

  handleBlur(field, event) {
    let el = event.target;

  }

  handleChange(id, event) {
    let el = event.target;
    let value = el.type == 'checkbox' && el.tagName == 'INPUT' ? el.checked.toString() : el.value;
    this.setState(id, value);
  }
};

function parseOptions(options) {
  if (Array.isArray(options)) {
    return options.map(option => {
      return {
        name: option.name || option,
        value: option.value || option
      };
    });
  } else if (typeof options == 'object') {
    return Object.keys(options).map(key => {
      return {
        name: key,
        value: options[key]
      };
    });
  } else if (typeof options == 'string') {
    return parseOptions(options.split(','));
  } else {
    return [];
  }
}

export default formHelper;
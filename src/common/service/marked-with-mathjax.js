const mathJax = require('mathjax-node');
const marked = require('marked');

module.exports = class extends think.Service {
  /**
   * 渲染具体的 MathJax 表达式
   *
   * @param content
   * @returns {Promise.<*>}
   */
  async _renderMathJax(content) {
    mathJax.config({
      MathJax: {}
    });
    mathJax.start();

    return await new Promise(resolve => {
      mathJax.typeset({
        math: content,
        format: 'TeX',
        svg: true,
      }, function (data) {
        resolve(data.svg);
      });
    });
  }


  /**
   * 渲染行内数学表达式
   * @param text
   * @returns {Promise.<*>}
   */
  async _mathSpanRender(text) {
    const reg = /`\$(.*?)\$`/g;
    let cap;

    reg.lastIndex = 0;

    while (text) {
      cap = reg.exec(text);
      if (cap) {
        const strStart = cap.index;
        const strEnd = cap.index + cap[0].length;
        const mathContent = await this._renderMathJax(cap[1]);

        text = text.substring(0, strStart) + mathContent + text.substring(strEnd);
        reg.lastIndex += mathContent.length - cap[0].length;
      } else {
        break;
      }
    }

    return text;
  }

  /**
   * 渲染 Markdown 文本
   *
   * @param content
   * @returns {Promise.<void>}
   */
  async render(content) {
    var mathLexer = new marked.Lexer();
    var tokens = mathLexer.lex(content);

    for (let i = 0; i < tokens.length; i++) {
      const item = tokens[i];

      // 处理块级表达式
      if (item.type === 'code' && item.lang === 'math') {
        tokens[i] = {
          type: 'paragraph',
          text: await this._renderMathJax(item.text),
        }
      }

      // 处理表格
      if (item.type === 'table') {
        // 处理表头
        let j, k
        for (j = 0; j < item.header.length; j++) {
          item.header[j] = await this._mathSpanRender(item.header[j])
        }
        // 处理单元格
        for (j = 0; j < item.cells.length; j++) {
          for (k = 0; k < item.cells[j].length; k++) {
            item.cells[j][k] = await this._mathSpanRender(item.cells[j][k])
          }
        }
      }

      // 处理行内表达式
      if (item.text) {
        item.text = await this._mathSpanRender(item.text);
      }
    }

    return marked.Parser.parse(tokens);
  }
}


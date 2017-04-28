/**
 *
 * @author    Jerry Bendy
 * @since     4/28/2017
 */

import mathJax from 'mathjax-node';
import marked from 'marked';


export default {

  /**
   * 渲染 Markdown 文本
   *
   * @param content
   * @returns {Promise.<void>}
   */
  async render (content) {
    var mathLexer = new marked.Lexer();
    var tokens = mathLexer.lex(content);

    let i = 0;

    for (; i < tokens.length; i++) {
      const item = tokens[i];

      // 处理块级表达式
      if (item.type === 'code' && item.lang === 'math') {
        tokens[i] = {
          type: 'paragraph',
          text: await this.renderMathJax(item.text),
        }
      }

      // 处理行内表达式
      if (item.text) {
        item.text = await this.mathSpanRender(item.text);
      }
    }

    return marked.Parser.parse(tokens);
  },


  /**
   * 渲染具体的 MathJax 表达式
   *
   * @param content
   * @returns {Promise.<*>}
   */
  async renderMathJax (content) {
    mathJax.config({
      MathJax: {}
    });
    mathJax.start();

    return await _render(content);

    function _render (math) {
      return new Promise(resolve => {
        mathJax.typeset({
          math,
          format: 'TeX',
          svg: true,
        }, function (data) {
          resolve(data.svg);
        });
      })
    }
  },


  /**
   * 渲染行内数学表达式
   * @param text
   * @returns {Promise.<*>}
   */
  async mathSpanRender (text) {
    const reg = /`\$(.*?)\$`/g;
    let cap;

    reg.lastIndex = 0;

    while (text) {
      cap = reg.exec(text);
      if (cap) {
        const strStart = cap.index;
        const strEnd = cap.index + cap[0].length;
        const mathContent = await this.renderMathJax(cap[1]);

        text = text.substring(0, strStart) + mathContent + text.substring(strEnd);

        reg.lastIndex += mathContent.length;

      } else {
        break;
      }
    }

    return text;
  }
}

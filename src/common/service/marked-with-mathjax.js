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
   * 渲染 Markdown 文本
   *
   * @param content
   * @returns {Promise.<void>}
   */
  async render(content) {
    var mathLexer = new marked.Lexer();
    var tokens = mathLexer.lex(content);

    // 处理LaTeX公式
    const dfs = async (tokensArr) => {
      for (let i = 0; i < (tokensArr?.length || 0); i++) {
        const item = tokensArr[i];

        // 处理块级表达式
        if (item.type === 'code' && item.lang === 'math') {
          tokensArr[i] = {
            type: 'paragraph',
            tokens: [
              {
                type: 'html',
                text: await this._renderMathJax(item.text)
              }
            ],
          };
        }

        // 处理行内表达式
        if (item.type === 'codespan' && item.text.startsWith('$') && item.text.endsWith('$')) {
          tokensArr[i] = {
            type: 'html',
            text: await this._renderMathJax(item.text.slice(1, -1))
          };
        }

        // 处理表格
        if (item.type === 'table') {
          // 处理表头
          let j, k;
          for (j = 0; j < (item?.header?.length || 0); j++) {
            await dfs(item.header[j].tokens);
          }
          // 处理单元格
          for (j = 0; j < (item?.rows?.length || 0); j++) {
            for (k = 0; k < (item?.rows[j]?.length || 0); k++) {
              await dfs(item.rows[j][k].tokens);
            }
          }
        }

        // 处理列表
        if (item.type === 'list') {
          for (let j = 0; j < (item?.items?.length || 0); j++) {
            await dfs(item.items[j].tokens);
          }
        }

        // 递归处理子tokens
        if (item.tokens && Array.isArray(item.tokens)) {
          await dfs(item.tokens);
        }
      }
    };

    await dfs(tokens);

    return marked.Parser.parse(tokens);
  }
}

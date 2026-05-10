const MathJax = require('mathjax');
const { Lexer, Parser } = require('marked');

const mathJaxReady = MathJax.init({
  loader: { load: ['input/tex', 'output/svg'] },
  svg: { fontCache: 'none' }
});

module.exports = class extends think.Service {
  /**
   * 渲染具体的 MathJax 表达式
   *
   * @param content
   * @param formulaType
   * @returns {Promise.<*>}
   */
  async _renderMathJax(content, formulaType) {
    await mathJaxReady;
    const node = await MathJax.tex2svgPromise(content, { display: formulaType === 'block' });
    const svg = MathJax.startup.adaptor.serializeXML(node);
    return `<span class="firekylin-markdown-mathjax-${formulaType}">${svg}</span>`;
  }

  /**
   * 渲染 Markdown 文本
   *
   * @param content
   * @returns {Promise.<void>}
   */
  async render(content) {
    var mathLexer = new Lexer();
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
                text: await this._renderMathJax(item.text, 'block')
              }
            ],
          };
        }

        // 处理行内表达式
        if (item.type === 'codespan' && item.text.startsWith('$') && item.text.endsWith('$')) {
          tokensArr[i] = {
            type: 'html',
            text: await this._renderMathJax(item.text.slice(1, -1), 'inline')
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

    return Parser.parse(tokens);
  }
}

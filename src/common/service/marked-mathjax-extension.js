const MathJax = require('mathjax');

const mathJaxReady = MathJax.init({
  loader: { load: ['input/tex', 'output/svg'] },
  svg: { fontCache: 'none' }
});

async function renderMathJax(content, formulaType) {
  await mathJaxReady;
  const node = await MathJax.tex2svgPromise(content, { display: formulaType === 'block' });
  const svg = MathJax.startup.adaptor.serializeXML(node);
  return `<span class="firekylin-markdown-mathjax-${formulaType}">${svg}</span>`;
}

module.exports = function markedMathjaxExtension() {
  return {
    async: true,
    async walkTokens(token) {
      // 块级公式：```math ... ```
      if (token.type === 'code' && token.lang === 'math') {
        const formula = token.text;
        token.type = 'paragraph';
        token.tokens = [{ type: 'html', text: await renderMathJax(formula, 'block'), raw: '' }];
        token.text = '';
      }
      // 行内公式：`$...$`
      if (token.type === 'codespan' && token.text.startsWith('$') && token.text.endsWith('$')) {
        token.type = 'html';
        token.text = await renderMathJax(token.text.slice(1, -1), 'inline');
        token.raw = token.text;
      }
    }
  };
};

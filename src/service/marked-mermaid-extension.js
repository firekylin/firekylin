module.exports = function markedMermaidExtension() {
  return {
    renderer: {
      code: function ({ text: code, lang }) {
        if (lang == 'mermaid') return `<pre class="mermaid">${code}</pre>`;
        return false;
      },
    },
  };
};

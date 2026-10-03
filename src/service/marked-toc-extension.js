module.exports = function markedTocExtension({ generateTocName, tocEntries }) {
  return {
    renderer: {
      heading(token) {
        const id = generateTocName(token.text);
        const content = this.parser.parseInline(token.tokens);
        tocEntries.push({ id, content, level: token.depth });
        return `<h${token.depth}><a id="${id}" class="anchor" href="#${id}"></a>${content}</h${token.depth}>`;
      }
    }
  };
};

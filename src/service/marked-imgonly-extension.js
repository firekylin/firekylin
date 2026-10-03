/**
 * marked 扩展：为仅含图片的段落添加class
 *
 * 渲染阶段检测段落 token，若全部子 token 均为 image 类型，
 * 则输出 <p class="firekylin-markdown-img-only">...</p>，供主题实现多图并排样式。
 */
module.exports = function markedImgonlyExtension() {
  return {
    renderer: {
      paragraph({ tokens }) {
        const isImgOnly = tokens.some(t => t.type === 'image') && tokens.every(t =>
          t.type === 'image' || (t.type === 'text' && !t.text.trim())
        );
        if (isImgOnly) {
          const inner = this.parser.parseInline(tokens);
          return `<p class="firekylin-markdown-img-only">${inner}</p>\n`;
        }
        return false;
      }
    }
  };
};

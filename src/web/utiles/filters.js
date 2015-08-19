import moment from 'moment';
import marked from 'marked';
import highlight from 'highlight.js';


export default {
  truncate(string, length = 100, ellipsis = '...') {
    return String(string).length > length ?
    string.substr(0, length - ellipsis.length) + ellipsis :
        string;
  },

  formatDate(date, format = 'YYYY-MM-DD') {
    return moment(date).format(format);
  },

  excerpt(string, ellipsis) {
    return this.truncate(string, 200, ellipsis);
  },

  parseCode(string, object = {}) {
    return string.replace(/\$\$(\w+)\$\$/g, (_, key) => object[key] || '');
  },

  markdown(str, parseCode = true) {
    marked.setOptions({
      highlight(code, lang) {
        if (!parseCode || !lang) {
          return code;
        }
        lang = lang.toLowerCase();
        if (highlight.getLanguage(lang)){
          return highlight.highlight(lang, code).value;
        } else {
          highlight.highlightAuto(code);
          return highlight.highlightAuto(code).value;
        }
      }
    });
    return marked(str).replace(/(class="lang-([^"]+)")/g, '$1 lang="$2"');
  },

  flatHTML(string) {
    return string.replace(/<.+?>/g, '');
  }
}
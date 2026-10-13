const {getContext} = require('../../lib/project-context');

function getMcpConfig() {
  const project = getContext();
  return (project.legacy ? think.config('mcp') : project.config && project.config.mcp) || {};
}

module.exports = {getMcpConfig};

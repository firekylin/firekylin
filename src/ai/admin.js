'use strict';

const OWNER = 'core-ai';

function registerAIAdmin(manager) {
  if (!manager.ai) return;
  const admin = manager.admin;
  admin.removePlugin(OWNER);
  admin.registerPanel({id: 'connections', title: 'AI 连接', icon: 'robot', order: 69}, OWNER);
  admin.registerPage({
    id: 'connections', panel: 'connections', title: 'AI 连接',
    description: '选择 AI 服务商、配置连接并设置默认模型。',
    load: async() => ({providers: await manager.ai.models()})
  }, OWNER);
  admin.registerAction({
    id: 'select-default', page: 'connections', label: '设为默认',
    handler: async input => {
      const selected = await manager.ai.select(input.provider, input.model);
      return {message: `已将 ${selected.provider} / ${selected.model} 设为默认。`};
    }
  }, OWNER);
}

module.exports = {registerAIAdmin};

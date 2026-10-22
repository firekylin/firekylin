'use strict';

const OWNER = 'core-ai';

function modelOptions(providers) {
  return providers.flatMap(provider => provider.models.map(model => ({
    label: `${provider.label} / ${model.label}`, value: `${provider.id}/${model.id}`
  })));
}

function selectedModel(providers) {
  for (const provider of providers) {
    const model = provider.models.find(item => item.selected);
    if (model) return `${provider.id}/${model.id}`;
  }
  return undefined;
}

function registerAIAdmin(manager) {
  if (!manager.ai) return;
  const admin = manager.admin;
  admin.removePlugin(OWNER);
  admin.registerPanel({id: 'service', title: 'AI 服务', icon: 'robot', order: 69}, OWNER);
  admin.registerPage({
    id: 'connections', panel: 'service', title: 'AI 服务',
    description: '配置已安装的 AI Provider，并选择内容功能使用的默认模型。',
    load: async() => {
      const providers = await manager.ai.models();
      const selected = selectedModel(providers);
      const links = providers.map(provider => {
        const owner = manager.aiProviders.get(provider.id)?.owner;
        const page = [...admin.pages.values()].find(item => item.pluginId === owner && item.id === 'settings');
        return {
          label: provider.label,
          description: `${provider.models.length} 个模型${typeof provider.configured === 'boolean' ?
            provider.configured ? ' · 已配置' : ' · 未配置' : ''}${provider.models.some(model => model.selected) ? ' · 当前默认' : ''}`,
          ...(page ? {href: `/admin/plugins/${owner}/${page.id}`} : {})
        };
      });
      return {sections: [
        {type: 'description', title: '当前默认', items: [
          {label: 'Provider / 模型', value: selected || '未选择'}
        ]},
        ...(providers.length ? [
          {type: 'links', title: '已安装 Provider（点击配置连接）', items: links},
          {type: 'form', id: 'default-model'}
        ] : [{type: 'empty', description: '尚未安装 AI Provider 插件。'}])
      ]};
    }
  }, OWNER);
  const options = modelOptions(manager.aiProviders.list());
  if (!options.length) return;
  admin.registerForm({
    id: 'default-model', page: 'connections', title: '默认模型', submitLabel: '设为默认',
    fields: [{name: 'selection', type: 'select', label: 'Provider / 模型', required: true, options}],
    load: async() => ({selection: selectedModel(await manager.ai.models())}),
    submit: async values => {
      const selection = String(values.selection || '');
      const option = options.find(item => item.value === selection);
      if (!option) throw new TypeError('Invalid AI provider/model selection');
      const slash = selection.indexOf('/');
      await manager.ai.select(selection.slice(0, slash), selection.slice(slash + 1));
      return {message: `默认模型已设为 ${option.label}。`};
    }
  }, OWNER);
}

module.exports = {registerAIAdmin, modelOptions, selectedModel};

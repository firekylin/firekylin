// ThinkJS skips logic when an exact controller-name match is absent. Run the
// shared API logic first so new controllers cannot bypass the default policy.
module.exports = () => {
  const BaseLogic = require('../logic/admin/api/base');
  return async(ctx, next) => {
    if (ctx.controller?.startsWith('admin/api/')) {
      if (await new BaseLogic(ctx).__before() === false) return false;
    }
    return next();
  };
};

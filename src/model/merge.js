/**
 * Merge the public-site model API into the corresponding administration model.
 *
 * The old multi-module layout allowed home and admin to expose different model
 * classes under the same name. A single-module application has one model per
 * name, so the resulting model needs to provide both sets of methods.
 */
module.exports = function mergeModel(AdminModel, PublicModel) {
  for (const name of Object.getOwnPropertyNames(PublicModel.prototype)) {
    if (name === 'constructor' || Object.prototype.hasOwnProperty.call(AdminModel.prototype, name)) continue;
    Object.defineProperty(
      AdminModel.prototype,
      name,
      Object.getOwnPropertyDescriptor(PublicModel.prototype, name)
    );
  }
  return AdminModel;
};

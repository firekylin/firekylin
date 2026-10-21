'use strict';

const ToolRegistry = require('../plugin/tools');

/**
 * Shared registry for business abilities exposed through different adapters.
 *
 * Retain ToolRegistry's existing registration and authorization contracts while
 * transitioning plugins and controllers to the transport-neutral Ability name.
 * Each registered ability opts into supported channels through `expose`.
 */
class AbilityRegistry extends ToolRegistry {}

module.exports = AbilityRegistry;

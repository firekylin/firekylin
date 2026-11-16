'use strict';

// Keep public search independent of database-specific JSON functions. Unknown
// or malformed metadata is not searchable until it is saved in a valid form.
function passwordProtectionState(options) {
  if (options === undefined || options === null || options === '') return 0;
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options);
    } catch {
      return 1;
    }
  }
  if (options === null) return 0;
  if (typeof options !== 'object' || Array.isArray(options)) return 1;
  return Number(Boolean(options.postPasswordHash));
}

module.exports = {passwordProtectionState};

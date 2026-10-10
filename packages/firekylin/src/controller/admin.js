// Keep `/admin` and client-side administration routes handled by the admin
// shell while API and server actions live under `controller/admin/**`.
module.exports = class extends require('./admin/base') {};

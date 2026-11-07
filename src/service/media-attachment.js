'use strict';

const path = require('node:path');

// Both the admin uploader and media ability must register the stored file.
async function createAttachment({url, file, storage, userId}, {getModel, now, uuid}) {
  const timestamp = now();
  const name = file.name || path.basename(url);
  return getModel().addPost({
    user_id: Number(userId),
    type: 2,
    status: 3,
    title: name,
    pathname: uuid(),
    summary: '',
    markdown_content: '',
    content: '',
    allow_comment: 0,
    create_time: timestamp,
    update_time: timestamp,
    is_public: 1,
    comment_num: 0,
    options: JSON.stringify({attachment: {
      name,
      url,
      size: Number(file.size) || 0,
      mime: file.type || 'application/octet-stream',
      storage
    }})
  });
}

module.exports = {createAttachment};

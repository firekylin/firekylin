import {Files} from 'files-sdk';
import {fs} from 'files-sdk/fs';
import {s3} from 'files-sdk/s3';
import {alibaba} from 'files-sdk/alibaba';
import {tencent} from 'files-sdk/tencent';
import {r2} from 'files-sdk/r2';
import {minio} from 'files-sdk/minio';
import {backblazeB2} from 'files-sdk/backblaze-b2';
import {wasabi} from 'files-sdk/wasabi';
import {digitaloceanSpaces} from 'files-sdk/digitalocean-spaces';
import {vercelBlob} from 'files-sdk/vercel-blob';

export const providers = {
  local: fs,
  s3,
  aliyun: alibaba,
  tencent,
  r2,
  minio,
  backblaze: backblazeB2,
  wasabi,
  digitalocean: digitaloceanSpaces,
  vercel: vercelBlob
};

export {Files};

'use strict';

module.exports = function capabilities(config, options, env = process.env, mailer) {
  const services = {};
  const provider = config.captchaProvider;
  if (['turnstile', 'recaptcha'].includes(provider)) {
    services.captcha = {
      async verify(token, ctx) {
        const secret = provider === 'turnstile' ? env.TURNSTILE_KEY : env.RECAPTCHA_SECRET;
        if (!secret || typeof token !== 'string' || !token || token.length > 8192) return false;
        try {
          const response = await fetch(provider === 'turnstile'
            ? 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
            : 'https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            body: new URLSearchParams({secret, response: token, remoteip: ctx.ip || ''}),
            signal: AbortSignal.timeout(10000)
          });
          if (!response.ok) return false;
          const result = await response.json();
          return result.success === true && (provider !== 'recaptcha' ||
            (typeof result.score === 'number' && result.score >= 0.5));
        } catch {
          return false;
        }
      }
    };
  }
  if (config.mailNotify) {
    const transport = env.SMTP_HOST && (mailer || require('nodemailer')).createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 465,
      secure: env.SMTP_SECURE !== 'false',
      auth: env.SMTP_USER ? {user: env.SMTP_USER, pass: env.SMTP_PASS} : undefined,
      connectionTimeout: 10000, socketTimeout: 10000
    });
    services.notification = {
      async send(comment, parent, approvedReply = false) {
        if (!transport || !env.SMTP_FROM) {
          think.logger.error('Comment mail requires SMTP_HOST and SMTP_FROM');
          return;
        }
        const site = options.siteName || 'Firekylin';
        const recipients = new Set();
        if (!approvedReply && env.AUTHOR_EMAIL) recipients.add(env.AUTHOR_EMAIL);
        if (comment.status === 'approved' && parent && parent.mail && parent.mail !== comment.mail) {
          recipients.add(parent.mail);
        }
        let url;
        try {
          url = new URL(comment.url, options.siteUrl);
          if (url.origin !== new URL(options.siteUrl).origin) return;
        } catch { return }
        for (const to of recipients) {
          try {
            await transport.sendMail({
              from: env.SMTP_FROM, to,
              subject: `[${site}] ${parent ? '评论有新回复' : '收到新评论'}`,
              text: `${comment.nick || '访客'}：\n${comment.rawComment || comment.comment}\n\n${url.href}`
            });
          } catch {
            think.logger.error('Comment notification delivery failed');
          }
        }
      }
    };
  }
  return services;
};

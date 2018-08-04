switch (process.env.NODE_ENV) {
    case 'prod':
    case 'production':
        module.exports = require('./www/config/webpack.prod');
        break;
    case 'dev':
    case 'development':
        module.exports = require('./www/config/webpack.dev');
        break;
    default:
        module.exports = require('./www/config/webpack.dev');
}

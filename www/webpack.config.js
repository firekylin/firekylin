module.exports = {
    entry: "./static/src/app.jsx",
    output: {
        path: "./static/js/admin/",
        filename: "combo.js"
    },
    externals: {
        //don't bundle the 'react' npm package with our bundle.js
        //but get it from a global 'React' variable
        'react': 'React',
        'react-bootstrap': 'ReactBootstrap',
        'react-router': 'ReactRouter',
        'moment': 'moment'
    },
    module: {
        loaders: [
            { test: /\.jsx$/, loader: "babel"},
        ]
    },
    resolve: {
        alias: {
            // 'react' : __dirname + '/node_modules/react/dist/react-with-addons',
            // Router : __dirname + '/node_modules/react-router/umd/',
            // components : __dirname + '/src/components',
            // filters : __dirname + '/src/filters',
            // model : __dirname + '/src/model'
        }
    }
};
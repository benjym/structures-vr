const path = require('path');

module.exports = [
    {
        mode: "development",
        // mode: "production",
        entry: './js/index.js',
        output: {
            path: path.resolve(__dirname, 'js'),
            filename: 'bundle.js',
        },
        watch: true,
        devServer: {
            static: {
              directory: '.'
            },
        },
    },
];

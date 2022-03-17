const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
    {
        mode: "development",
        // mode: "production",
        entry: './js/index.js',
        plugins: [new HtmlWebpackPlugin({ title: 'Beam bending' })],
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'bundle.js',
            clean: true,
        },
        devServer: {
            static: {
              directory: '.'
            },
        },
        module: {
            rules: [
              {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
              },
            ],
          },
    },
];

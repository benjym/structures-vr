const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
  {
    mode: "development",
    // mode: "production",
    entry: './js/index.js',
    plugins: [
      new HtmlWebpackPlugin({
        title: 'BMLY',
        favicon: "./resources/favicon512.png",
        template: "index.html",
      }),
      new webpack.ProvidePlugin({
        // THREE : '../../three.js/'
        THREE: 'three'
      })
    ],
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
        {
          test: /\.(ico|webmanifest)$/,
          exclude: /node_modules/,
          use: ["file-loader?name=[name].[ext]"] // ?name=[name].[ext] is only necessary to preserve the original file name
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
          // use: ["file-loader?name=[name].[ext]"]
        },
      ],
    },
  },
];

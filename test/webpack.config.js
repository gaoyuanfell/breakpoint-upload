const path = require("path");
module.exports = {
  mode: "development",
  entry: "./index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  devServer: {
    compress: true,
    historyApiFallback: true,
    hot: true,
    port: 9000,
  },
};

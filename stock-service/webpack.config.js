const path = require("path");
const nodeExternals = require("webpack-node-externals");
const WebpackShellPlugin = require("webpack-shell-plugin");

const { NODE_ENV = "production" } = process.env;

module.exports = {
  entry: "./index.ts",
  mode: NODE_ENV,
  target: "node",
  watch: NODE_ENV === "development",
  externals: [nodeExternals()],
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "index.js"
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  plugins: [
    new WebpackShellPlugin({
      onBuildEnd: ["npm run run:watch"]
    })
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ["ts-loader"]
      }
    ]
  }
};

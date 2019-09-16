const { join } = require("path");
const nodeExternals = require("webpack-node-externals");
const WebpackShellPlugin = require("webpack-shell-plugin");

const { NODE_ENV = "production" } = process.env;

module.exports = {
  entry: join(__dirname, "src/index"),
  mode: NODE_ENV,
  target: "node",
  watch: NODE_ENV === "development",
  externals: [nodeExternals()],
  devtool: "inline-source-map",
  output: {
    path: join(__dirname, "build"),
    filename: "bundle.js",

    // Bundle absolute resource paths in the source-map,
    // so VSCode can match the source file.
    devtoolModuleFilenameTemplate: "[absolute-resource-path]"
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
        use: ["awesome-typescript-loader"],
        exclude: /node_modules/
      }
    ]
  }
};

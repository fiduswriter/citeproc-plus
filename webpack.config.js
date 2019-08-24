module.exports = {
  mode: "production",
  output: {
    publicPath: "dist/",
  },
  module: {
    rules: [
      {
        test: /\.(csljson)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
};

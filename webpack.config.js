module.exports = {
  mode: "production",
  output: {
    publicPath: "/citeproc-plus/dist/",
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

import esbuild from "esbuild";

/**
 * @type {esbuild.Plugin}
 */
const makeAllPackagesExternalPlugin = {
  name: "make-all-packages-external",
  setup(build) {
    const filter = /^[^./@]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

esbuild.build({
  entryPoints: ["test/testParse.ts"],
  sourcemap: "inline",
  plugins: [makeAllPackagesExternalPlugin],
  outdir: "dist",
  platform: "node",
  format: "cjs",
  bundle: true,
  sourceRoot: "src",
  treeShaking: true,
});

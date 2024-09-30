# Token Assets

The goal of this project is to unify the cryptocurrency token assets under one
CDN with pragmatic access.

The CDN supports SVG and PNGs (small, larger).

## Usage

Currently the API/CDN endpoint is at:

```
https://assets.smold.app/api/token/[chainID]/[tokenAddress]/[fileName].[ext]
```

## Usage

It's recommended to use PNG files. They are smaller and faster to load, come in two sizes (32x32 and 128x128) and are supported by all browsers.
SVG files are also available, but they are larger and slower to load and can hurt performances for poorly optimized assets or very complex ones (ex: curvefi icon).

## (Self) Hosting

The repo comes with two different server systems in `_config`:
- a `golang` server, that serve the assets from github
- a `node` server, configured to work with Vercel. If you want to self host, here is the config we are using:
```
Framework Preset: Next.js
Build Command: yarn --cwd _config/nodeAPI/ run build
Output Directory: _config/nodeAPI/.next
Install Command: yarn install && yarn --cwd _config/nodeAPI/ install
Development Command: next
Node Version: 18.x
Environment Variables: None
```


## Contributing

You will need an SVG file of the logo of the asset. You can use
[Inkscape](https://inkscape.org/) or a web tool like
https://cloudconvert.com/svg-to-png to convert the SVG file into the PNGs.

With Inkscape you can run:

```
$ inkscape -w 128 -h 128 logo.svg -o logo-128.png
$ inkscape -w 32 -h 32 logo.svg -o logo-32.png
```

You can also use `rsvg-convert` from the [`librsvg2`](https://formulae.brew.sh/formula/librsvg) package:

```
$ rsvg-convert -w 128 -h 128 logo.svg > logo-128.png
$ rsvg-convert -h 32 logo.svg > logo-32.png
<!-- or -->
$ rsvg-convert -h 32 logo.svg > logo-32.png && rsvg-convert -h 128 logo.svg > logo-128.png
```

Once ready, create a new directory with the chain ID, or use the existing one,
and create a new directory for the token address (in lower case) you are adding.

Fill-in the details when creating the pull-request, and we'll merge it shortly!

That's it, thank you!

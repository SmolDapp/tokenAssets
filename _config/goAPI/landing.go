package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

/**************************************************************************************************
** The root used to return a bare JSON greeting, which left assets.smold.app without any crawlable
** HTML (no title, description, canonical, Open Graph, structured data, h1). This serves a small,
** self-describing landing page instead. Copy is the service's own wording from the UI, kept
** factual. The asset endpoints (/token, /chain) and their redirects are unchanged.
**************************************************************************************************/
const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Smol Token Assets — Open-source token &amp; chain logo CDN</title>
<meta name="description" content="Every cryptocurrency token logo, unified under one endpoint. SVG and PNG, addressed by chain ID and contract — free, with no API key.">
<link rel="canonical" href="https://assets.smold.app/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://assets.smold.app/">
<meta property="og:title" content="Smol Token Assets — Open-source token &amp; chain logo CDN">
<meta property="og:description" content="Every cryptocurrency token logo, unified under one endpoint. SVG and PNG, addressed by chain ID and contract — free, with no API key.">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Smol Token Assets","url":"https://assets.smold.app/","description":"Every cryptocurrency token logo, unified under one endpoint. SVG and PNG, addressed by chain ID and contract — free, with no API key.","publisher":{"@type":"Organization","name":"SmolDapp","url":"https://smold.app"}}</script>
</head>
<body>
<h1>Smol Token Assets</h1>
<p>Open-source CDN for cryptocurrency token and blockchain logos. Every logo is addressed by chain ID and contract address, served as SVG or PNG, free and without an API key.</p>
<p>Example endpoint:</p>
<pre>https://assets.smold.app/token/{chainId}/{address}/logo-128.png</pre>
<p><a href="https://tokens.smold.app">Browse the catalog</a> · <a href="/sitemap.xml">Sitemap</a> · <a href="https://github.com/SmolDapp/tokenAssets">Source on GitHub</a></p>
</body>
</html>
`

func ServeIndex(c *gin.Context) {
	c.Header(`Cache-Control`, `public, max-age=3600`)
	c.Data(http.StatusOK, `text/html; charset=utf-8`, []byte(indexHTML))
}

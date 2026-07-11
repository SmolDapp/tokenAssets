package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// resolveFallback answers a request for a non-canonical asset. `?fallback=true` redirects to the
// bundled placeholder; `?fallback=<http(s) url>` redirects the browser to that URL — we never fetch
// it (no SSRF) and it renders on its own origin, http(s) only so the Location cannot carry a
// javascript: or data: scheme. Anything else is a plain 404.
func resolveFallback(c *gin.Context, placeholder string) {
	fallback := c.Query("fallback")
	if fallback == "true" {
		c.Redirect(http.StatusTemporaryRedirect, RedirectBaseURI()+placeholder)
		c.Abort()
		return
	}
	if strings.HasPrefix(fallback, "https://") || strings.HasPrefix(fallback, "http://") {
		c.Redirect(http.StatusTemporaryRedirect, fallback)
		c.Abort()
		return
	}
	c.String(http.StatusNotFound, "Not found")
}

func ServeToken(c *gin.Context) {
	chainIDStr := c.Param("chainID")
	tokenAddress := c.Param("tokenAddress")
	fileName := c.Param("filename")

	if strings.HasPrefix(tokenAddress, "0x") {
		tokenAddress = strings.ToLower(tokenAddress)
	}

	if !ContainsSubString([]string{"logo.svg", "logo-32.png", "logo-128.png"}, fileName) {
		if tokenAddress == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" {
			resolveFallback(c, `/_config/nodeAPI/public/gas-token.png`)
			return
		}
		resolveFallback(c, `/_config/nodeAPI/public/not-found.png`)
		return
	}

	targetURL := fmt.Sprintf("%s/tokens/%s/%s/%s", RedirectBaseURI(), chainIDStr, tokenAddress, fileName)
	c.Header(`Cache-Control`, REDIRECT_CACHE_CONTROL)
	c.Redirect(http.StatusTemporaryRedirect, targetURL)
	c.Abort()
}

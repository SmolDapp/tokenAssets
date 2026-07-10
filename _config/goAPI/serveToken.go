package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func resolveNotFound(c *gin.Context) {
	fallback := c.Query("fallback")
	if fallback == "true" {
		c.Redirect(http.StatusTemporaryRedirect, RedirectBaseURI()+`/_config/nodeAPI/public/not-found.png`)
		c.Abort()
		return
	}

	// A caller may point fallback at their own image URL. Redirect the browser to it instead of
	// fetching it server-side: the daemon makes no arbitrary outbound request (no SSRF), and the
	// image renders on its own origin, never ours. http(s) only, so the Location cannot carry a
	// javascript: or data: scheme.
	if strings.HasPrefix(fallback, "https://") || strings.HasPrefix(fallback, "http://") {
		c.Redirect(http.StatusTemporaryRedirect, fallback)
		c.Abort()
		return
	}

	c.String(http.StatusNotFound, "Not found")
}

func resolveGasToken(c *gin.Context) {
	fallback := c.Query("fallback")
	if fallback == "true" {
		c.Redirect(http.StatusTemporaryRedirect, RedirectBaseURI()+`/_config/nodeAPI/public/gas-token.png`)
		c.Abort()
		return
	}

	// A caller may point fallback at their own image URL. Redirect the browser to it instead of
	// fetching it server-side: the daemon makes no arbitrary outbound request (no SSRF), and the
	// image renders on its own origin, never ours. http(s) only, so the Location cannot carry a
	// javascript: or data: scheme.
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
			resolveGasToken(c)
			return
		}
		resolveNotFound(c)
		return
	}

	targetURL := fmt.Sprintf("%s/tokens/%s/%s/%s", RedirectBaseURI(), chainIDStr, tokenAddress, fileName)
	c.Header(`Cache-Control`, REDIRECT_CACHE_CONTROL)
	c.Redirect(http.StatusTemporaryRedirect, targetURL)
	c.Abort()
}

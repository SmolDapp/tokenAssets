package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ServeChain(c *gin.Context) {
	chainIDStr := c.Param("chainID")
	fileName := c.Param("filename")

	if !ContainsSubString([]string{"logo.svg", "logo-32.png", "logo-128.png"}, fileName) {
		resolveFallback(c, `/_config/nodeAPI/public/not-found.png`)
		return
	}

	targetURL := fmt.Sprintf("%s/chains/%s/%s", RedirectBaseURI(), chainIDStr, fileName)
	c.Header(`Cache-Control`, REDIRECT_CACHE_CONTROL)
	c.Redirect(http.StatusTemporaryRedirect, targetURL)
	c.Abort()
}

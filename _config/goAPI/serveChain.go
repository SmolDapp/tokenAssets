package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

const BASE_CHAIN_URI = `https://raw.githubusercontent.com/yearn/tokenAssets/main`

func ServeChain(c *gin.Context) {
	chainIDStr := c.Param("chainID")
	fileName := c.Param("filename")

	if !ContainsSubString([]string{"logo.svg", "logo-32.png", "logo-128.png"}, fileName) {
		resolveNotFound(c)
		return
	}

	targetURL := fmt.Sprintf("%s/chains/%s/%s", BASE_CHAIN_URI, chainIDStr, fileName)
	c.Redirect(http.StatusPermanentRedirect, targetURL)
	c.Abort()
}

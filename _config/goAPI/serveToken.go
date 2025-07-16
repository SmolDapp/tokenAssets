package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const BASE_TOKENS_URI = `https://raw.githubusercontent.com/yearn/tokenAssets/main`

func resolveNotFound(c *gin.Context) {
	fallback := c.Query("fallback")
	if fallback == "true" {
		c.Redirect(http.StatusTemporaryRedirect, BASE_TOKENS_URI+`/_config/nodeAPI/public/not-found.png`)
		c.Abort()
		return
	}

	if fallback != "" {
		resp, err := http.Get(fallback)
		if err != nil {
			c.String(http.StatusNotFound, "Not found")
			return
		}
		defer resp.Body.Close()

		contentType := resp.Header.Get("Content-Type")
		if contentType != "" && strings.HasPrefix(contentType, "image/") {
			fmt.Printf("Using fallback image for gas token: %s\n", fallback)
			c.DataFromReader(http.StatusOK, resp.ContentLength, contentType, resp.Body, nil)
			return
		}
	}

	c.String(http.StatusNotFound, "Not found")
}

func resolveGasToken(c *gin.Context) {
	fallback := c.Query("fallback")
	if fallback == "true" {
		c.Redirect(http.StatusTemporaryRedirect, BASE_TOKENS_URI+`/_config/nodeAPI/public/gas-token.png`)
		c.Abort()
		return
	}

	if fallback != "" {
		resp, err := http.Get(fallback)
		if err != nil {
			c.String(http.StatusNotFound, "Not found")
			return
		}
		defer resp.Body.Close()

		contentType := resp.Header.Get("Content-Type")
		if contentType != "" && strings.HasPrefix(contentType, "image/") {
			fmt.Printf("Using fallback image for gas token: %s\n", fallback)
			c.DataFromReader(http.StatusOK, resp.ContentLength, contentType, resp.Body, nil)
			return
		}
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

	targetURL := fmt.Sprintf("%s/tokens/%s/%s/%s", BASE_TOKENS_URI, chainIDStr, tokenAddress, fileName)
	c.Redirect(http.StatusPermanentRedirect, targetURL)
	c.Abort()
}

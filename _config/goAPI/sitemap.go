package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-co-op/gocron"
)

/**************************************************************************************************
** The catalog is the token/chain index the UI already generates and commits. We read it from the
** same CDN the assets are served from (RedirectBaseURI: jsDelivr, with a GitHub fallback) instead
** of keeping any state here. PUBLIC_BASE_URI is this service's canonical public host, used to
** build the absolute asset URLs listed in the sitemap.
**************************************************************************************************/
const CATALOG_DATA_PATH = `/_config/ui/public/data`
const PUBLIC_BASE_URI = `https://assets.smold.app`

// The canonical files every token and chain logo is published as.
var catalogAssetFiles = []string{`logo.svg`, `logo-32.png`, `logo-128.png`}

var sitemapXML atomic.Value // holds the last successfully rendered []byte
var catalogClient = &http.Client{Timeout: 15 * time.Second}

type catalogToken struct {
	ChainID string `json:"chainID"`
	Address string `json:"address"`
}

type catalogChain struct {
	ID    string `json:"id"`
	OnCDN bool   `json:"onCDN"`
}

func fetchCatalogJSON(path string, out any) error {
	response, err := catalogClient.Get(RedirectBaseURI() + path)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf(`catalog fetch %s: status %d`, path, response.StatusCode)
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, out)
}

/**************************************************************************************************
** buildSitemap fetches the committed token/chain index and renders a standard XML sitemap listing
** every servable asset URL. Tokens in search.json all have logos; chains are included only when
** onCDN is true. Addresses are lower-cased to match the on-disk paths (as ServeToken does). The
** sitemap spec caps a single file at 50,000 URLs — at three files per entry this holds until
** ~16k tokens, beyond which this must split into a sitemap index.
**************************************************************************************************/
func buildSitemap() ([]byte, error) {
	var tokens []catalogToken
	if err := fetchCatalogJSON(CATALOG_DATA_PATH+`/search.json`, &tokens); err != nil {
		return nil, err
	}
	var chains []catalogChain
	if err := fetchCatalogJSON(CATALOG_DATA_PATH+`/allChains.json`, &chains); err != nil {
		return nil, err
	}

	var builder strings.Builder
	builder.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	builder.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	writeURL := func(path string) {
		builder.WriteString(`<url><loc>` + PUBLIC_BASE_URI + path + `</loc></url>` + "\n")
	}
	for _, token := range tokens {
		address := strings.ToLower(token.Address)
		for _, file := range catalogAssetFiles {
			writeURL(`/token/` + token.ChainID + `/` + address + `/` + file)
		}
	}
	for _, chain := range chains {
		if !chain.OnCDN {
			continue
		}
		for _, file := range catalogAssetFiles {
			writeURL(`/chain/` + chain.ID + `/` + file)
		}
	}
	builder.WriteString(`</urlset>` + "\n")
	return []byte(builder.String()), nil
}

/**************************************************************************************************
** sitemapLoop renders the sitemap once at startup and refreshes it hourly, mirroring the CDN
** health loop: requests read the pre-rendered bytes from memory, so the multi-hundred-KB fetch and
** render never sit on the request path. A failed refresh keeps the previous good sitemap in place.
**************************************************************************************************/
func sitemapLoop() {
	refresh := func() {
		rendered, err := buildSitemap()
		if err != nil {
			fmt.Println(`sitemap refresh failed:`, err)
			return
		}
		sitemapXML.Store(rendered)
	}
	refresh()
	scheduler := gocron.NewScheduler(time.UTC)
	scheduler.Every(1).Hours().Do(refresh)
	scheduler.StartAsync()
}

func ServeSitemap(c *gin.Context) {
	value := sitemapXML.Load()
	if value == nil {
		c.String(http.StatusServiceUnavailable, `sitemap not ready`)
		return
	}
	c.Header(`Cache-Control`, `public, max-age=3600`)
	c.Data(http.StatusOK, `application/xml; charset=utf-8`, value.([]byte))
}

// robotsTxt allows crawling and advertises the asset catalog so crawlers can discover it.
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ` + PUBLIC_BASE_URI + `/sitemap.xml
`

func ServeRobots(c *gin.Context) {
	c.Header(`Cache-Control`, `public, max-age=86400`)
	c.Data(http.StatusOK, `text/plain; charset=utf-8`, []byte(robotsTxt))
}

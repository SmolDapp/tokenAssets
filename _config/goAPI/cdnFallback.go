package main

import (
	"net/http"
	"os"
	"sync/atomic"
	"time"

	"github.com/go-co-op/gocron"
)

/**************************************************************************************************
** jsDelivr is the primary redirect target: multi-CDN (Fastly + Cloudflare + Bunny) and 7-day
** client cache headers, versus 5 minutes on raw.githubusercontent.com. GitHub raw stays as the
** always-valid fallback: both serve the exact same files from the main branch, so switching
** between them is safe at any moment.
**************************************************************************************************/
const JSDELIVR_BASE_URI = `https://cdn.jsdelivr.net/gh/SmolDapp/tokenAssets@main`
const GITHUB_BASE_URI = `https://raw.githubusercontent.com/SmolDapp/tokenAssets/main`
const HEALTH_CANARY_URI = JSDELIVR_BASE_URI + `/chains/1/logo-32.png`

/**************************************************************************************************
** Redirects carry a short client cache so the failover window stays bounded: health detection
** (up to ~60s) plus this TTL is the worst case for a client to keep following a dead target.
** The asset itself is cached 7 days by jsDelivr, so only this tiny 307 gets re-requested.
**************************************************************************************************/
const REDIRECT_CACHE_CONTROL = `public, max-age=300`

var forceGithubRedirect = os.Getenv(`FORCE_GITHUB_CDN`) == `true`
var jsDelivrHealthy atomic.Bool
var healthCheckClient = &http.Client{Timeout: 5 * time.Second}

/**************************************************************************************************
** RedirectBaseURI returns the CDN base currently considered safe. The process starts on GitHub
** (the long-standing behavior) and only promotes jsDelivr once the health loop has confirmed it.
** Setting FORCE_GITHUB_CDN=true pins the legacy behavior without a code change.
**************************************************************************************************/
func RedirectBaseURI() string {
	if forceGithubRedirect {
		return GITHUB_BASE_URI
	}
	if jsDelivrHealthy.Load() {
		return JSDELIVR_BASE_URI
	}
	return GITHUB_BASE_URI
}

func isJsDelivrUp() bool {
	response, err := healthCheckClient.Get(HEALTH_CANARY_URI)
	if err != nil {
		return false
	}
	defer response.Body.Close()
	return response.StatusCode == http.StatusOK
}

/**************************************************************************************************
** cdnHealthLoop probes jsDelivr every 30 seconds. Two consecutive results in the same direction
** flip the target, so a single network blip never flaps the CDN choice. Both targets serve
** identical content, so a flip is always safe — only latency characteristics change.
**************************************************************************************************/
func cdnHealthLoop() {
	consecutiveUp := 0
	consecutiveDown := 0
	probe := func() {
		if isJsDelivrUp() {
			consecutiveUp++
			consecutiveDown = 0
			if consecutiveUp >= 2 {
				jsDelivrHealthy.Store(true)
			}
		} else {
			consecutiveDown++
			consecutiveUp = 0
			if consecutiveDown >= 2 {
				jsDelivrHealthy.Store(false)
			}
		}
	}
	probe()
	scheduler := gocron.NewScheduler(time.UTC)
	scheduler.Every(30).Seconds().Do(probe)
	scheduler.StartAsync()
}

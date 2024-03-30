package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/pprof"
	"github.com/gin-gonic/gin"
	"github.com/go-co-op/gocron"
	"github.com/patrickmn/go-cache"
	"golang.org/x/time/rate"
)

var originOfAccess = []string{}

/**************************************************************************************************
** Main entry point for the daemon, handling everything from initialization to running external
** processes.
**************************************************************************************************/
func main() {
	fmt.Println("Starting SmolAssets API")
	go accessLogger()
	NewRouter().Run(`:8081`)
}

func accessLogger() {
	scheduler := gocron.NewScheduler(time.UTC)
	scheduler.Every(60).Minutes().Do(func() {
		fmt.Println(originOfAccess)
	})
	scheduler.StartAsync()
}

/**************************************************************************************************
** Rate limiting based on https://github.com/yangxikun/gin-limit-by-key/blob/master/limit.go and
** adapted to our needs.
**************************************************************************************************/
var limiterSet = cache.New(5*time.Minute, 10*time.Minute)

var rootURI = []string{
	"http", //Allow all for now
	".smold.app",
	"http://localhost:",
}

func NewRateLimiter(abort func(*gin.Context)) gin.HandlerFunc {
	return func(c *gin.Context) {
		/******************************************************************************************
		** Retrieve the origin from the request header and use it as the key for the rate limiter.
		** If the origin is not present, we use an empty string as the key.
		******************************************************************************************/
		k := ``
		origin := c.Request.Header.Get("Origin")
		if len(origin) == 0 {
			k = ``
		} else {
			k = origin
		}

		if !ContainsSubString(originOfAccess, k) {
			originOfAccess = append(originOfAccess, k)
		}

		/******************************************************************************************
		** Allows the requests from the allowlist without rate limiting. This is to allow us to
		** bypass the rate limiting for our own services.
		******************************************************************************************/
		if EndsWithSubstring(rootURI, origin) || origin == `` {
			c.Next()
			return
		}

		/******************************************************************************************
		** Otherwise, we use the rate limiter to limit the requests to 10 qps/clientIp and permit
		******************************************************************************************/
		limiter, ok := limiterSet.Get(k)
		if !ok {
			var expire time.Duration
			// limit 25 query per second per origin and permit bursts of at most 25 tokens, and the limiter liveness time duration is 15 minutes
			limiter, expire = rate.NewLimiter(rate.Every(1*time.Second), 50), 15*time.Minute
			limiterSet.Set(k, limiter, expire)
		}
		ok = limiter.(*rate.Limiter).Allow()
		if !ok {
			abort(c)
			return
		}
		c.Next()
	}
}

func NewRouter() *gin.Engine {
	gin.EnableJsonDecoderDisallowUnknownFields()
	gin.SetMode(gin.ReleaseMode)
	gin.DefaultWriter = nil
	router := gin.New()
	pprof.Register(router)
	router.Use(gin.Recovery())
	corsConf := cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "HEAD"},
		AllowHeaders:    []string{`Origin`, `Content-Length`, `Content-Type`, `Authorization`},
	}
	router.Use(cors.New(corsConf))
	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(NewRateLimiter(func(c *gin.Context) {
		c.AbortWithStatus(http.StatusTooManyRequests)
	}))

	// Standard basic route for hello
	router.GET(`/`, func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"message": "Welcome to SmolAssets"})
	})

	// Starting with API for node conf copy
	router.GET(`api/token/:chainID/:tokenAddress/:filename`, ServeToken)
	router.GET(`api/tokens/:chainID/:tokenAddress/:filename`, ServeToken)
	router.GET(`api/chain/:chainID/:filename`, ServeChain)
	router.GET(`api/chains/:chainID/:filename`, ServeChain)

	// Ommitting the /api/ prefix
	router.GET(`token/:chainID/:tokenAddress/:filename`, ServeToken)
	router.GET(`tokens/:chainID/:tokenAddress/:filename`, ServeToken)
	router.GET(`chain/:chainID/:filename`, ServeChain)
	router.GET(`chains/:chainID/:filename`, ServeChain)

	return router
}

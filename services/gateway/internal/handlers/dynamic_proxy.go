package handlers

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/jacobekanem/gainz/gateway/internal/config"
)

// DynamicProxyHandler is a handler that dynamically routes requests to appropriate services
type DynamicProxyHandler struct {
	cfg *config.Config
}

// NewDynamicProxyHandler creates a new dynamic proxy handler
func NewDynamicProxyHandler(cfg *config.Config) *DynamicProxyHandler {
	return &DynamicProxyHandler{
		cfg: cfg,
	}
}

// RegisterRoutes registers all service routes with the router based on the configuration
func (h *DynamicProxyHandler) RegisterRoutes(router *gin.Engine) {
	if h.cfg.ServicesConfig == nil || len(h.cfg.ServicesConfig.Services) == 0 {
		log.Println("No services configured, not registering any routes")
		return
	}

	for name, service := range h.cfg.ServicesConfig.Services {
		log.Printf("Registering service: %s at prefix: %s -> %s", name, service.Prefix, service.URL)
		
		// Create a router group for this service prefix
		group := router.Group(service.Prefix)
		
		// Register a catch-all route for this service
		group.Any("/*path", h.createServiceHandler(name, service))
	}
}

// createServiceHandler creates a handler function for a specific service
func (h *DynamicProxyHandler) createServiceHandler(name string, service config.ServiceDefinition) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.proxyRequest(c, service.URL, service.Prefix)
	}
}

// proxyRequest forwards the request to the appropriate service
func (h *DynamicProxyHandler) proxyRequest(c *gin.Context, targetURL, prefix string) {
	originalPath := c.Request.URL.Path
	originalMethod := c.Request.Method
	
	log.Printf("Gateway received request: %s %s for service at %s", originalMethod, originalPath, targetURL)

	// Parse the target URL
	target, err := url.Parse(targetURL)
	if err != nil {
		log.Printf("Error parsing target URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gateway configuration error"})
		return
	}

	// Extract the path parameter
	pathParam := c.Param("path")
	
	// Create director function to modify the request
	director := func(req *http.Request) {
		// Set target base URL
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		
		// Get the request path relative to the service prefix
		// For example, if prefix is "/api/auth" and the request is "/api/auth/login",
		// then req.URL.Path should be "/login"
		if pathParam == "" || pathParam == "/" {
			req.URL.Path = "/"
		} else {
			req.URL.Path = pathParam
		}
		
		// Set the Host header to the target host
		req.Host = target.Host
		
		log.Printf("Proxying request: %s %s -> %s://%s%s", 
			originalMethod, originalPath, req.URL.Scheme, req.URL.Host, req.URL.Path)
	}

	// Create the reverse proxy
	proxy := &httputil.ReverseProxy{
		Director: director,
		ModifyResponse: func(resp *http.Response) error {
			log.Printf("Received response from %s: %d", targetURL, resp.StatusCode)
			return nil
		},
		ErrorHandler: func(rw http.ResponseWriter, req *http.Request, err error) {
			log.Printf("Error proxying request to %s: %v", targetURL, err)
			c.JSON(http.StatusBadGateway, gin.H{
				"error": "Service unavailable",
			})
		},
	}

	// Execute the proxy request
	proxy.ServeHTTP(c.Writer, c.Request)
}

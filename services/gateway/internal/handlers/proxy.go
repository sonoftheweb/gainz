package handlers

import (
	"bytes"
	"github.com/jacobekanem/gainz/gateway/internal/config"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

// ProxyHandler handles forwarding requests to the appropriate service
type ProxyHandler struct {
	cfg *config.Config
}

// NewProxyHandler creates a new ProxyHandler instance
func NewProxyHandler(cfg *config.Config) *ProxyHandler {
	return &ProxyHandler{
		cfg: cfg,
	}
}

// HandleAuth proxies requests to the authentication service
func (h *ProxyHandler) HandleAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		h.proxyRequest(c, h.cfg.AuthServiceURL, "/api/auth")
	}
}

// HandleAuthorize proxies requests to the authorization service
func (h *ProxyHandler) HandleAuthorize() gin.HandlerFunc {
	return func(c *gin.Context) {
		h.proxyRequest(c, h.cfg.AuthorizationServiceURL, "/api/authorize")
	}
}

// HandleUsers proxies requests to the user service
func (h *ProxyHandler) HandleUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		h.proxyRequest(c, h.cfg.UserServiceURL, "/api/users")
	}
}

// proxyRequest handles the actual proxying of requests
func (h *ProxyHandler) proxyRequest(c *gin.Context, targetURL, basePath string) {
	// Parse the target URL
	target, err := url.Parse(targetURL)
	if err != nil {
		log.Printf("Error parsing target URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gateway error"})
		return
	}

	// Create a reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(target)

	// Update the request URL
	path := strings.TrimPrefix(c.Request.URL.Path, basePath)
	c.Request.URL.Path = path
	c.Request.URL.Host = target.Host
	c.Request.URL.Scheme = target.Scheme
	c.Request.Host = target.Host

	// Save the request body
	var bodyBytes []byte
	if c.Request.Body != nil {
		bodyBytes, _ = io.ReadAll(c.Request.Body)
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	}

	// Forward request headers
	c.Request.Header.Set("X-Forwarded-Host", c.Request.Header.Get("Host"))
	c.Request.Header.Set("X-Forwarded-For", c.ClientIP())

	// Create a custom response writer to capture the response
	responseWriter := &responseWriter{ResponseWriter: c.Writer}
	
	// Serve the request
	proxy.ServeHTTP(responseWriter, c.Request)

	// If the response was already written, don't do anything else
	if responseWriter.Written {
		return
	}

	// If we got here, an error occurred in the proxy
	c.JSON(http.StatusBadGateway, gin.H{"error": "Gateway error: service unavailable"})
}

// Custom response writer to capture the response
type responseWriter struct {
	gin.ResponseWriter
	Written bool
}

// Write overrides the default Write method to mark when a response has been written
func (w *responseWriter) Write(b []byte) (int, error) {
	w.Written = true
	return w.ResponseWriter.Write(b)
}

// WriteHeader overrides the default WriteHeader method to mark when a response has been written
func (w *responseWriter) WriteHeader(statusCode int) {
	w.Written = true
	w.ResponseWriter.WriteHeader(statusCode)
}

package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

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
		// Get the full request path including all wildcards
		fullPath := c.Request.URL.Path
		
		// Extract the path after the service prefix
		relativePath := strings.TrimPrefix(fullPath, service.Prefix)
		if !strings.HasPrefix(relativePath, "/") {
			relativePath = "/" + relativePath
		}
		
		log.Printf("[Gateway] Request for %s service, full path: %s, relative path: %s", 
			name, fullPath, relativePath)
		
		// Determine if this request requires authentication
		requiresAuth := false
		
		// Check if service is fully protected
		if service.FullyProtected {
			requiresAuth = true
			log.Printf("[Gateway] Service %s is fully protected, requiring authentication", name)
		} else if len(service.ProtectedPaths) > 0 {
			// Check if path matches any protected paths
			for _, protectedPath := range service.ProtectedPaths {
				if strings.HasPrefix(relativePath, protectedPath) {
					requiresAuth = true
					log.Printf("[Gateway] Path %s matches protected path %s", relativePath, protectedPath)
					break
				}
			}
		}
		
		// Check if path is explicitly marked as public
		if len(service.PublicPaths) > 0 {
			for _, publicPath := range service.PublicPaths {
				if strings.HasPrefix(relativePath, publicPath) {
					requiresAuth = false
					log.Printf("[Gateway] Path %s matches public path %s, no auth required", relativePath, publicPath)
					break
				}
			}
		}
		
		var userInfo map[string]interface{}
		
		// If authentication is required, validate the token
		if requiresAuth {
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
				c.Abort()
				return
			}
			
			token := strings.TrimPrefix(authHeader, "Bearer ")
			
			// Validate token and get user info
			var err error
			userInfo, err = h.getUserInfoFromToken(token)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
				c.Abort()
				return
			}
			
			// Store user info in context for internal use
			c.Set("user", userInfo)
		}
		
		// Forward the request with user info (if authenticated)
		h.proxyRequest(c, service.URL, service.Prefix, userInfo)
	}
}

// getUserInfoFromToken validates a JWT token by calling the authorization service
// and returns the user information if the token is valid
func (h *DynamicProxyHandler) getUserInfoFromToken(token string) (map[string]interface{}, error) {
	// Get the authorization service configuration
	authService, exists := h.cfg.ServicesConfig.Services["authorization"]
	if !exists {
		return nil, fmt.Errorf("authorization service not configured")
	}
	
	// Create the request payload
	payload := map[string]string{"token": token}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal token payload: %w", err)
	}
	
	// Build the full URL for the validate endpoint
	validateURL := authService.URL + authService.Prefix + "/validate"
	log.Printf("[Gateway] Calling authorization service at: %s", validateURL)
	
	// Call the authorization service's validate endpoint
	resp, err := http.Post(
		validateURL,
		"application/json",
		bytes.NewBuffer(payloadBytes),
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to call authorization service: %w", err)
	}
	defer resp.Body.Close()
	
	// Read the response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read authorization response: %w", err)
	}
	
	// If the response is not 200 OK, the token is invalid
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token validation failed: %s", string(respBody))
	}
	
	// Log the response for debugging
	log.Printf("[Gateway] Authorization response: %d - %s", resp.StatusCode, string(respBody))
	
	// Parse the response JSON
	var result struct {
		Valid   bool                   `json:"valid"`
		Message string                 `json:"message"`
		User    map[string]interface{} `json:"user"`
	}
	
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse authorization response: %w", err)
	}
	
	// Verify that the token is valid
	if !result.Valid {
		return nil, fmt.Errorf("token is invalid")
	}
	
	return result.User, nil
}

// proxyRequest forwards the request to the appropriate service
func (h *DynamicProxyHandler) proxyRequest(c *gin.Context, targetURL, prefix string, userInfo map[string]interface{}) {
	originalPath := c.Request.URL.Path
	originalMethod := c.Request.Method
	
	log.Printf("[Gateway] Received request: %s %s for service at %s with prefix %s", 
		originalMethod, originalPath, targetURL, prefix)

	// Parse the target URL
	target, err := url.Parse(targetURL)
	if err != nil {
		log.Printf("[Gateway] Error parsing target URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gateway configuration error"})
		return
	}

	// Forward the original path as-is without stripping the prefix
	// This ensures that requests to /api/auth/login are forwarded to the service with the full path
	forwardPath := originalPath
	
	log.Printf("[Gateway] Forward path: %s", forwardPath)
	
	// Create director function to modify the request
	director := func(req *http.Request) {
		// Set target base URL
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		
		// Set the forward path calculated above
		req.URL.Path = forwardPath
		
		// Copy all headers to preserve authentication information, etc.
		for headerKey, headerValues := range c.Request.Header {
			for _, value := range headerValues {
				req.Header.Add(headerKey, value)
			}
		}
		
		// If user is authenticated, add user info as a custom header
		if userInfo != nil {
			// Convert user info to JSON string
			userInfoJSON, err := json.Marshal(userInfo)
			if err == nil {
				// Add custom header with base64 encoded user info
				encodedUserInfo := base64.StdEncoding.EncodeToString(userInfoJSON)
				req.Header.Set("X-User-Info", encodedUserInfo)
			}
		}
		
		// Set the Host header to the target host
		req.Host = target.Host
		
		log.Printf("[Gateway] Proxying request: %s %s -> %s://%s%s", 
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

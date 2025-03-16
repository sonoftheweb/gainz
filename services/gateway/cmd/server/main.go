package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/jacobekanem/gainz/gateway/internal/config"
	"github.com/jacobekanem/gainz/gateway/internal/handlers"
	"github.com/jacobekanem/gainz/gateway/internal/middleware"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Set up Gin
	router := gin.Default()

	// Add middleware
	router.Use(middleware.Logger())
	router.Use(middleware.SetupCORS())

	// Create handlers
	proxyHandler := handlers.NewProxyHandler(cfg)

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})

	// API routes
	api := router.Group("/api")
	{
		// Authentication service routes
		auth := api.Group("/auth")
		auth.Any("/*path", proxyHandler.HandleAuth())

		// Authorization service routes
		authorize := api.Group("/authorize")
		authorize.Any("/*path", proxyHandler.HandleAuthorize())

		// User service routes
		users := api.Group("/users")
		users.Any("/*path", proxyHandler.HandleUsers())
	}

	// Start server
	serverAddr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("Gateway server starting on port %d", cfg.Port)

	// Handle graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := router.Run(serverAddr); err != nil {
			log.Fatalf("Error starting server: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-quit
	log.Println("Shutting down server...")
}
// Test comment Mon Mar  3 00:25:36 AST 2025
// Test comment Mon Mar  3 10:40:43 PM AST 2025
// Test comment Sat Mar 15 10:26:20 PM ADT 2025

package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the gateway
type Config struct {
	Port                 int
	AuthServiceURL       string
	AuthorizationServiceURL string
	UserServiceURL       string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() *Config {
	// Load .env file if it exists
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	port, err := strconv.Atoi(getEnv("PORT", "80"))
	if err != nil {
		log.Println("Invalid PORT, using default 80")
		port = 80
	}

	return &Config{
		Port:                 port,
		AuthServiceURL:       getEnv("AUTH_SERVICE_URL", "http://authentication:3001"),
		AuthorizationServiceURL: getEnv("AUTHORIZATION_SERVICE_URL", "http://authorization:3002"),
		UserServiceURL:       getEnv("USER_SERVICE_URL", "http://user:3003"),
	}
}

// Helper function to get environment variables with a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

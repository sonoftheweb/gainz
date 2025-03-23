package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the gateway
type Config struct {
	Port            int
	ServicesConfig  *ServicesConfig
	ServicesConfigPath string
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

	configPath := getEnv("SERVICES_CONFIG_PATH", "")

	// Load service configurations from YAML
	servicesConfig, err := LoadServicesConfig(configPath)
	if err != nil {
		log.Printf("Error loading services config: %v", err)
		log.Println("Gateway will start with no service routes configured")
		servicesConfig = &ServicesConfig{Services: make(map[string]ServiceDefinition)}
	}

	return &Config{
		Port:               port,
		ServicesConfig:     servicesConfig,
		ServicesConfigPath: configPath,
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

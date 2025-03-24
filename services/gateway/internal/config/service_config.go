package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// ServiceDefinition represents a single microservice configuration
type ServiceDefinition struct {
	URL            string   `yaml:"url"`
	Prefix         string   `yaml:"prefix"`
	FullyProtected bool     `yaml:"fully_protected"` // All routes require authentication
	ProtectedPaths []string `yaml:"protected_paths"` // Specific paths requiring authentication
	PublicPaths    []string `yaml:"public_paths"`    // Specific paths not requiring authentication
	Internal       bool     `yaml:"internal"`        // Service is used internally by the gateway
}

// ServicesConfig holds all microservice configurations
type ServicesConfig struct {
	Services map[string]ServiceDefinition `yaml:"services"`
}

// LoadServicesConfig loads service definitions from the YAML config file
func LoadServicesConfig(configPath string) (*ServicesConfig, error) {
	if configPath == "" {
		// Default to the config directory in the project root
		workDir, err := os.Getwd()
		if err != nil {
			return nil, fmt.Errorf("failed to get working directory: %w", err)
		}
		
		// Try to locate the config file
		configPath = filepath.Join(workDir, "config", "services.yaml")
		
		// If running from cmd/server, adjust path
		if filepath.Base(workDir) == "server" {
			configPath = filepath.Join(workDir, "..", "..", "config", "services.yaml")
		}
	}

	// Read the YAML file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Parse the YAML
	var config ServicesConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Validate the configuration
	if len(config.Services) == 0 {
		return nil, fmt.Errorf("no services defined in config file")
	}

	// Process services - apply environment variable overrides if available
	for name, svc := range config.Services {
		// Check if base config is valid
		if svc.URL == "" {
			return nil, fmt.Errorf("service %s is missing URL", name)
		}
		if svc.Prefix == "" {
			return nil, fmt.Errorf("service %s is missing prefix", name)
		}
		
		// Look for an environment variable override for this service URL
		// Format: SERVICENAME_SERVICE_URL (e.g., AUTHENTICATION_SERVICE_URL)
		envVarName := fmt.Sprintf("%s_SERVICE_URL", name)
		envVarName = strings.ToUpper(envVarName)
		
		if envURL := os.Getenv(envVarName); envURL != "" {
			// Override the URL from the environment variable
			svc.URL = envURL
			config.Services[name] = svc
			log.Printf("Using environment override for %s service: %s", name, envURL)
		}
	}

	log.Printf("Loaded %d service definitions", len(config.Services))
	return &config, nil
}

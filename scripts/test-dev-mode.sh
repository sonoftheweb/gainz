#!/bin/bash

echo "Testing development mode for all services..."

# Test authentication service
echo "Adding a test comment to authentication service..."
echo "// Test comment $(date)" >> ./services/authentication/src/controllers/authController.ts
sleep 2
docker logs gainz-authentication --tail=5
echo ""

# Test authorization service
echo "Adding a test comment to authorization service..."
echo "// Test comment $(date)" >> ./services/authorization/src/controllers/authorizationController.ts
sleep 2
docker logs gainz-authorization --tail=5
echo ""

# Test user service
echo "Adding a test comment to user service..."
echo "// Test comment $(date)" >> ./services/user/src/controllers/userController.ts
sleep 2
docker logs gainz-user --tail=5
echo ""

# Test gateway service (may not show logs if using air)
echo "Adding a test comment to gateway service..."
echo "// Test comment $(date)" >> ./services/gateway/cmd/server/main.go
sleep 2
docker logs gainz-gateway --tail=5
echo ""

echo "Development mode test complete!"

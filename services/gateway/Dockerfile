FROM golang:1.21-alpine as builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway ./cmd/server/main.go

# Use a smaller image for runtime
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/gateway .

# Copy .env file
COPY .env .

# Create config directory and copy YAML configuration
RUN mkdir -p /root/config
COPY --from=builder /app/config/services.yaml /root/config/

EXPOSE 80

CMD ["./gateway"]

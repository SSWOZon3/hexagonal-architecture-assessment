# 🚀 Technical Assessment Dogfy API - Docker Setup

A logistics API built with Hexagonal Architecture and DDD using Node.js, TypeScript, Fastify and MongoDB.

## 🐳 Quick Start with Docker

### Prerequisites
- Docker
- Docker Compose

### 1. Run the Application
```bash
# Run with Docker Compose
docker-compose up --build
```

### 2. Verify it's Working
- **API**: http://localhost:3003
- **Swagger Documentation**: http://localhost:3003/docs
- **MongoDB**: mongodb://localhost:27017/dogfy

## 📝 Useful Docker Commands

```bash
# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Stop and remove volumes (cleans database)
docker-compose down -v

# Rebuild only the API
docker-compose up --build api
```

## 🧪 Testing the API Features

This microservice implements all the required features from the technical assessment. Here's how to test each one:

### ✅ Feature 1: Handle Delivery Creation Requests

**Create a delivery (system automatically selects provider):**
```bash
curl -X POST http://localhost:3003/deliveries \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER123",
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "customerInfo": {
      "name": "John Doe",
      "email": "john.doe@email.com",
      "phone": "+1234567890"
    }
  }'
```

**Expected Response (with shipping label):**
```json
{
  "deliveryId": "67123abc456def789ghi012j",
  "orderId": "ORDER123",
  "provider": "NRW",
  "labelUrl": "https://api.nrw-shipping.com/labels/NRW1730023456789.pdf",
  "trackingNumber": "NRW1730023456789",
  "estimatedDelivery": "2024-10-29T10:00:00.000Z",
  "status": "CONFIRMED"
}
```

**Create another delivery (may get different provider):**
```bash
curl -X POST http://localhost:3003/deliveries \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER456", 
    "shippingAddress": {
      "street": "456 Oak Avenue",
      "city": "Los Angeles", 
      "state": "CA",
      "zipCode": "90210",
      "country": "USA"
    },
    "customerInfo": {
      "name": "Jane Smith",
      "email": "jane.smith@email.com", 
      "phone": "+0987654321"
    }
  }'
```

**Expected Response (TLS provider example):**
```json
{
  "deliveryId": "67456def789ghi012jkl345m",
  "orderId": "ORDER456", 
  "provider": "TLS",
  "labelUrl": "https://api.tls-logistics.com/labels/TLS1730023567890.pdf",
  "trackingNumber": "TLS1730023567890",
  "estimatedDelivery": "2024-10-28T14:30:00.000Z",
  "status": "CONFIRMED"
}
```

### ✅ Feature 2: Query Real-time Delivery Status

**Get delivery status by ID:**
```bash
curl http://localhost:3003/deliveries/67123abc456def789ghi012j/status
```

**Expected Response:**
```json
{
  "deliveryId": "67123abc456def789ghi012j",
  "orderId": "ORDER123",
  "provider": "NRW", 
  "status": "IN_TRANSIT",
  "labelUrl": "https://api.nrw-shipping.com/labels/NRW1730023456789.pdf",
  "createdAt": "2024-10-26T10:00:00.000Z",
  "updatedAt": "2024-10-26T11:30:00.000Z"
}
```

### ✅ Feature 3: Multiple Shipping Provider Support

The system automatically selects between NRW and TLS providers based on availability. You can test by creating multiple deliveries:

**Test automatic provider selection:**
```bash
# Create multiple deliveries - system will pick different providers
for i in {1..5}; do
  curl -X POST http://localhost:3003/deliveries \
    -H "Content-Type: application/json" \
    -d "{
      \"orderId\": \"TEST_$i\",
      \"shippingAddress\": {
        \"street\": \"$i Test Street\",
        \"city\": \"Test City\",
        \"state\": \"TC\", 
        \"zipCode\": \"12345\",
        \"country\": \"USA\"
      },
      \"customerInfo\": {
        \"name\": \"Test User $i\",
        \"email\": \"test$i@email.com\",
        \"phone\": \"+123456789$i\"
      }
    }" && echo
done
```

**Provider differences:**
- **NRW**: Uses tracking pattern `NRW{timestamp}{random}`, labels at `api.nrw-shipping.com`
- **TLS**: Uses tracking pattern `TLS{timestamp}{random}`, labels at `api.tls-logistics.com`

### ✅ Feature 4: Status Update Mechanisms

**Note**: There's no direct PUT endpoint for manual status updates. Status updates happen via:

1. **Webhook updates (simulating provider callbacks):**

```bash
curl -X POST http://localhost:3003/webhooks/delivery-status \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "NRW1730023456789",
    "status": "DELIVERED"
  }'
```

**Valid status values:**
- `PENDING`
- `CONFIRMED` 
- `IN_TRANSIT`
- `DELIVERED`
- `CANCELLED`

2. **Automatic polling sync** (runs every 30 seconds in background)

### ✅ Feature 5: Real-time Status Sync

The application automatically syncs status from providers every 30 seconds. You can also trigger manual sync:

**Check sync service logs:**
```bash
docker-compose logs -f api | grep -i "sync\|polling"
```

**The service will automatically:**
- Poll NRW and TLS APIs for status updates
- Update delivery statuses in real-time
- Handle different provider data formats
- Process webhook callbacks from providers

## 📊 Delivery Status Flow

- `PENDING` - Initial status (rarely used)
- `CONFIRMED` - Delivery created and confirmed with provider
- `IN_TRANSIT` - Package is in transit
- `DELIVERED` - Package delivered successfully  
- `CANCELLED` - Delivery cancelled

## 🔄 Complete Testing Workflow

**1. Start the services:**
```bash
docker-compose up --build
```

**2. Create deliveries and capture IDs:**
```bash
# Create first delivery
DELIVERY_1=$(curl -s -X POST http://localhost:3003/deliveries \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST_001",
    "shippingAddress": {
      "street": "123 Test St",
      "city": "Test City", 
      "state": "TC",
      "zipCode": "12345",
      "country": "USA"
    },
    "customerInfo": {
      "name": "Test User 1",
      "email": "test1@email.com",
      "phone": "+1234567890"
    }
  }' | jq -r '.deliveryId')

# Create second delivery  
DELIVERY_2=$(curl -s -X POST http://localhost:3003/deliveries \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST_002",
    "shippingAddress": {
      "street": "456 Test Ave", 
      "city": "Test City",
      "state": "TC",
      "zipCode": "12345", 
      "country": "USA"
    },
    "customerInfo": {
      "name": "Test User 2",
      "email": "test2@email.com",
      "phone": "+0987654321"
    }
  }' | jq -r '.deliveryId')
```

**3. Check initial status:**
```bash
curl http://localhost:3003/deliveries/$DELIVERY_1/status
curl http://localhost:3003/deliveries/$DELIVERY_2/status
```

**4. Simulate provider webhook updates:**
```bash
# Get tracking numbers first
TRACKING_1=$(curl -s http://localhost:3003/deliveries/$DELIVERY_1/status | jq -r '.trackingNumber')
TRACKING_2=$(curl -s http://localhost:3003/deliveries/$DELIVERY_2/status | jq -r '.trackingNumber')

# Update first delivery to IN_TRANSIT
curl -X POST http://localhost:3003/webhooks/delivery-status \
  -H "Content-Type: application/json" \
  -d "{\"trackingNumber\": \"$TRACKING_1\", \"status\": \"IN_TRANSIT\"}"

# Update second delivery to DELIVERED  
curl -X POST http://localhost:3003/webhooks/delivery-status \
  -H "Content-Type: application/json" \
  -d "{\"trackingNumber\": \"$TRACKING_2\", \"status\": \"DELIVERED\"}"
```

**5. Verify status updates:**
```bash
curl http://localhost:3003/deliveries/$DELIVERY_1/status
curl http://localhost:3003/deliveries/$DELIVERY_2/status
```

## 🔧 Development Setup

If you want to develop locally without Docker:

```bash
# Install dependencies
npm install

# Run local MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7

# Run in development mode
npm run dev

# Run tests
npm test
```

## 🏗️ Architecture

The project follows Hexagonal Architecture principles:

- **Domain**: Entities and value objects
- **Application**: Use cases and ports
- **Infrastructure**: Adapters, database, HTTP

### Supported Shipping Providers
- **NRW**: NRW Shipping Provider (Mock)
- **TLS**: TLS Shipping Provider (Mock)

Each provider has different:
- API response formats
- Tracking number patterns  
- Label URL structures
- Status update mechanisms

## 📦 Project Structure

```
src/
├── domain/              # Domain layer
│   ├── entities/        # Business entities
│   ├── repositories/    # Repository contracts
│   └── value-objects/   # Value objects
├── application/         # Use cases
│   ├── ports/          # Interfaces/contracts
│   └── useCases/       # Business logic
└── infrastructure/      # Infrastructure adapters
    ├── http/           # Controllers and routes
    ├── db/             # Database implementation
    └── adapters/       # External services
```

## 🔍 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/deliveries` | Create new delivery |
| GET | `/deliveries/{id}/status` | Get delivery status |
| POST | `/webhooks/delivery-status` | Provider status webhook |

## 🚦 Health Check

The application includes automatic health checks for:
- MongoDB connectivity
- Application status
- Provider service availability

## 📚 Additional Documentation

- **Swagger UI**: http://localhost:3003/docs - Complete interactive API documentation
- All endpoints are documented with request/response examples
- Real-time testing interface available

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run unit tests only  
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## ❓ Troubleshooting

### Port 3003 already in use
```bash
# Change port in docker-compose.yml
ports:
  - "3004:3003"  # host:container
```

### MongoDB connection issues
```bash
# Check container logs
docker-compose logs mongodb

# Restart services
docker-compose restart
```

### Clean slate restart
```bash
docker-compose down -v
docker system prune -f
docker-compose up --build
```

### Provider Integration Issues
```bash
# Check provider adapter logs
docker-compose logs -f api | grep -i "provider\|shipping"

# Test provider connectivity
curl http://localhost:3003/docs  # Check Swagger for provider status
```
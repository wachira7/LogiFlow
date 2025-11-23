#!/bin/bash
# quick-docker-setup.sh
# Quick setup script for LogiFlow Docker

set -e

echo "🐳 LogiFlow Docker Quick Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and add your API keys${NC}"
    echo ""
fi

# Ask user what they want to do
echo "What would you like to do?"
echo "1) Start development environment"
echo "2) Build images only"
echo "3) Run tests"
echo "4) Clean up everything"
echo "5) View logs"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting development environment..."
        echo ""
        
        # Build images
        echo "📦 Building Docker images..."
        docker-compose build
        
        # Start services
        echo "🏃 Starting services..."
        docker-compose up -d
        
        # Wait for services to be ready
        echo "⏳ Waiting for services to be ready..."
        sleep 10
        
        # Run migrations
        echo "🔄 Running database migrations..."
        docker-compose exec backend python manage.py migrate --noinput
        
        # Collect static files
        echo "📦 Collecting static files..."
        docker-compose exec backend python manage.py collectstatic --noinput
        
        echo ""
        echo -e "${GREEN}✅ Development environment is ready!${NC}"
        echo ""
        echo "Services available at:"
        echo "  Frontend:     http://localhost:3000"
        echo "  Backend API:  http://localhost:8000/api"
        echo "  Django Admin: http://localhost:8000/admin"
        echo ""
        echo "To create a superuser, run:"
        echo "  docker-compose exec backend python manage.py createsuperuser"
        echo ""
        echo "To view logs:"
        echo "  docker-compose logs -f"
        echo ""
        ;;
        
    2)
        echo ""
        echo "📦 Building Docker images..."
        docker-compose build --parallel
        echo ""
        echo -e "${GREEN}✅ Images built successfully!${NC}"
        ;;
        
    3)
        echo ""
        echo "🧪 Running tests..."
        echo ""
        
        # Backend tests
        echo "Testing backend..."
        docker-compose run --rm backend python manage.py test
        
        # Frontend tests
        echo "Testing frontend..."
        docker-compose run --rm frontend npm test -- --passWithNoTests
        
        echo ""
        echo -e "${GREEN}✅ All tests passed!${NC}"
        ;;
        
    4)
        echo ""
        echo -e "${YELLOW}⚠️  This will remove all containers, volumes, and images${NC}"
        read -p "Are you sure? (y/N): " confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo "🧹 Cleaning up..."
            docker-compose down -v --rmi all
            echo -e "${GREEN}✅ Cleanup complete!${NC}"
        else
            echo "Cancelled."
        fi
        ;;
        
    5)
        echo ""
        echo "📋 Viewing logs (Ctrl+C to exit)..."
        echo ""
        docker-compose logs -f
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "Done! 🎉"
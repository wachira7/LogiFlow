#!/bin/bash
# docker/scripts/entrypoint.sh
# Backend entrypoint script

set -e

echo "🚀 Starting LogiFlow Backend..."

# Wait for database
echo "⏳ Waiting for PostgreSQL..."
while ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}"; do
  echo "⏳ PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "✅ PostgreSQL is up!"

# Wait for Redis
echo "⏳ Waiting for Redis..."
until redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ping > /dev/null 2>&1; do
  echo "⏳ Redis is unavailable - sleeping"
  sleep 1
done
echo "✅ Redis is up!"

# Run migrations
echo "🔄 Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create superuser if it doesn't exist
echo "👤 Creating superuser if needed..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@logiflow.com',
        password='${DJANGO_SUPERUSER_PASSWORD:-admin123}',
        first_name='Admin',
        last_name='User'
    )
    print('✅ Superuser created!')
else:
    print('✅ Superuser already exists')
EOF

# Load initial data if needed
if [ "$LOAD_INITIAL_DATA" = "true" ]; then
    echo "📥 Loading initial data..."
    python manage.py loaddata initial_data.json || true
fi

echo "✅ Backend initialization complete!"
echo "🚀 Starting application..."

# Execute the main command
exec "$@"
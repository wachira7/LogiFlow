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

# Wait for Redis using URL instead of host/port
echo "⏳ Waiting for Redis..."
until python -c "
import redis, os, sys
try:
    r = redis.from_url(os.environ['REDIS_URL'])
    r.ping()
    sys.exit(0)
except:
    sys.exit(1)
" > /dev/null 2>&1; do
  echo "⏳ Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is up!"

# Collect static files only
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create superuser if needed
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

echo "✅ Backend initialization complete!"
echo "🚀 Starting application..."

exec "$@"
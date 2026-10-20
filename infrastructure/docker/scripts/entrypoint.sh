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

# Collect static files only
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create a superuser only when a password is provided (never fall back to a default)
if [ -n "${DJANGO_SUPERUSER_PASSWORD}" ]; then
  echo "👤 Creating superuser if needed..."
  python manage.py shell <<'PYEOF'
import os
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email=os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@logiflow.com'),
        password=os.environ['DJANGO_SUPERUSER_PASSWORD'],
        first_name='Admin',
        last_name='User'
    )
    print('✅ Superuser created!')
else:
    print('✅ Superuser already exists')
PYEOF
else
  echo "ℹ️  DJANGO_SUPERUSER_PASSWORD not set; skipping superuser creation"
fi

echo "✅ Backend initialization complete!"
echo "🚀 Starting application..."

exec "$@"
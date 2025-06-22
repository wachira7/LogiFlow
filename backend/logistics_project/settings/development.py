# backend/logistics_project/settings/development.py
from .base import *
import os

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Additional allowed hosts for development
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Development-specific apps
DEVELOPMENT_APPS = []

# Add debug toolbar if enabled
if os.getenv('ENABLE_DEBUG_TOOLBAR', 'True').lower() in ('true', '1', 'yes'):
    DEVELOPMENT_APPS.append('debug_toolbar')
    MIDDLEWARE.insert(1, 'debug_toolbar.middleware.DebugToolbarMiddleware')

INSTALLED_APPS += DEVELOPMENT_APPS

# Debug toolbar configuration
INTERNAL_IPS = [
    '127.0.0.1',
    'localhost',
]

# Email backend for development (prints to console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Database for development (PostgreSQL)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'logiflow_dev'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# CORS settings for development
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',  # In case you use different ports
]

CORS_ALLOW_ALL_ORIGINS = True  # Only for development

# Disable HTTPS requirements in development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Media files served by Django in development
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Static files
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Swagger/OpenAPI documentation (enabled in development)
SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Token': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header'
        }
    },
    'USE_SESSION_AUTH': False,
    'JSON_EDITOR': True,
    'SUPPORTED_SUBMIT_METHODS': [
        'get',
        'post',
        'put',
        'delete',
        'patch'
    ],
}

# Celery settings for development
CELERY_TASK_ALWAYS_EAGER = False  # Set to True to run tasks synchronously
CELERY_TASK_EAGER_PROPAGATES = True

# Logging configuration for development
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/development.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}

# Development cache (use dummy cache for testing)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Override with Redis if available
REDIS_URL = os.getenv('REDIS_URL')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }

# Development-specific settings
ENABLE_SWAGGER = os.getenv('ENABLE_SWAGGER', 'True').lower() in ('true', '1', 'yes')

# File upload settings for development
FILE_UPLOAD_MAX_MEMORY_SIZE = 26214400  # 25MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 26214400  # 25MB

print("🚀 Running Logiflow in DEVELOPMENT mode")
print(f"📧 Admin notifications will be sent to: {ADMIN_EMAIL}")
print(f"🌐 Frontend URL: {FRONTEND_URL}")
print(f"🔗 API Base URL: {API_BASE_URL}")

# Quick SQLite setup for rapid development
if os.getenv('USE_SQLITE', 'False').lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    print("🗄️  Using SQLite database for rapid development")
    print(f"🔗 API Base URL: {API_BASE_URL}")
    print(f"🔧 Logiflow running in DEVELOPMENT environment")
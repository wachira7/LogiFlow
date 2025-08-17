#backend/logistics_project/settings.py

"""
Django settings for logistics_project project.
"""

from pathlib import Path
from datetime import timedelta
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-hg2iqi*hhg=)*_+^3eql!_vxj-_qk#y$(*9ts4p!+-tpl5d%yd'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']  # Updated for development

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',
    'django_filters',
    'django_extensions',
    
    # Local apps
    'apps.tenants',
    'apps.users',
    'apps.inventory',
    'apps.production',
    'apps.distribution',
    'apps.warehousing',
    'apps.payments',
    'apps.platform_admin',
    'backup',  # Your backup app
]

# Enhanced Middleware with your new utils
MIDDLEWARE = [
    'utils.middleware.SecurityHeadersMiddleware',
    'utils.middleware.RequestIDMiddleware', 
    'utils.middleware.CORSMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'utils.middleware.RateLimitMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.tenants.middleware.CompanyTenantMiddleware',      # New
    'apps.tenants.middleware.TenantValidationMiddleware',   # New
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'utils.middleware.RequestLoggingMiddleware',
    'utils.middleware.PerformanceMonitoringMiddleware',
    'apps.tenants.middleware.AuditLoggingMiddleware',       # New
    'utils.middleware.HealthCheckMiddleware',
    'utils.middleware.MaintenanceModeMiddleware',
]

ROOT_URLCONF = 'logistics_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'logistics_project.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Enhanced REST Framework Configuration with your pagination
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'utils.pagination.StandardPagination',  # Your custom pagination
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'EXCEPTION_HANDLER': 'utils.exceptions.custom_exception_handler',  # Custom error handling
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'LogiFlow API',
    'DESCRIPTION': 'Multi-tenant Logistics Platform API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/v1/',
    'TAGS': [
        {'name': 'Authentication', 'description': 'User authentication and authorization'},
        {'name': 'Payments', 'description': 'Payment processing and subscriptions'},
        {'name': 'Inventory', 'description': 'Inventory management'},
        {'name': 'Distribution', 'description': 'Order and shipping management'},
        {'name': 'Production', 'description': 'Manufacturing and production'},
        {'name': 'Warehousing', 'description': 'Warehouse operations'},
        {'name': 'Tenants', 'description': 'Multi-tenant company management'},
        {'name': 'Platform Admin', 'description': 'Platform administration'},
    ],
}

# Enhanced CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",      # Next.js dev server
    "http://127.0.0.1:3000",
    "http://localhost:8080",      # Alternative frontend port
    "https://app.logiflow.com",   # Production frontend
    "https://logiflow.com",       # Production domain
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Set to True only in development if needed

# Additional CORS settings for your utils
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.logiflow\.com$",  # Allow subdomains
]

# Cache Configuration (required for rate limiting and performance monitoring)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',  # For development
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        }
    }
}

# For production, use Redis:
# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.redis.RedisCache',
#         'LOCATION': 'redis://127.0.0.1:6379/1',
#         'OPTIONS': {
#             'CLIENT_CLASS': 'django_redis.client.DefaultClient',
#         }
#     }
# }

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Enhanced Logging Configuration
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
        'file': {
            'level': 'DEBUG',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'development.log',
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'performance': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'performance.log',
            'maxBytes': 1024*1024*5,  # 5MB
            'backupCount': 3,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'utils.middleware': {
            'handlers': ['performance', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'payments': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # or your email provider
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'  # Replace with your email
EMAIL_HOST_PASSWORD = 'your-app-password'  # Replace with app password
DEFAULT_FROM_EMAIL = 'LogiFlow <noreply@logiflow.com>'

# Frontend URL for invitation links
FRONTEND_URL = 'http://localhost:3000'  # Your Next.js frontend URL

# Application Configuration
APP_VERSION = '1.0.0'
ENVIRONMENT = 'development'

# Performance Monitoring Settings
STORE_PERFORMANCE_METRICS = True  # Enable performance metrics storage
ENABLE_RATE_LIMITING = False      # Disable in development, enable in production

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Security Settings (for production)
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY = "pk_test_51RsETiCPP9aVNHNKmpePvf4ycBYX2foNBdxy5yBudo1WWPHqYCSaZK2ii9cqsFDulYJroAbmZiDHEqQuYBb9PuSH00jtR4hNaf" 
STRIPE_SECRET_KEY = "sk_test_51RsETiCPP9aVNHNKuSQ3HcprZcqSlxNEapAP5XNaaLIiixygI8PQEUVgLQYsCVNPUKwJXdO24lL7K0PkuE21vOge008UA258Gn"       
STRIPE_WEBHOOK_SECRET = "whsec_2EgHOHl1aGJ4zCsTvBQKPynK2rGV7Fm0"    

# For production, use environment variables:
# STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
# STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
# STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# Stripe API Version
STRIPE_API_VERSION = "2023-10-16"

# M-Pesa Configuration (Safaricom Daraja API)
MPESA_CONSUMER_KEY = "LkbAP2cQavzYx3L3cG8rl3wyhEBLSAkyHvhzf4S5DvAbxSKr"
MPESA_CONSUMER_SECRET = "l6jlG7ci6lQbfOWAWMmK0pdH1AEibEdpGKvgtur6KA0Fn38ZvetZSfEr0GCzJScn"

# Sandbox Configuration
MPESA_ENVIRONMENT = "sandbox"  # Change to "production" for live environment
MPESA_SHORTCODE = "174379"  # Default sandbox shortcode 
MPESA_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"  # Default sandbox passkey

# M-Pesa API URLs
MPESA_BASE_URL = "https://sandbox.safaricom.co.ke"  # Sandbox URL
MPESA_AUTH_URL = f"{MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
MPESA_STK_PUSH_URL = f"{MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest"
MPESA_STK_QUERY_URL = f"{MPESA_BASE_URL}/mpesa/stkpushquery/v1/query" 
MPESA_ACCOUNT_BALANCE_URL = f"{MPESA_BASE_URL}/mpesa/accountbalance/v1/query"

# Callback URLs (using your ngrok tunnel for development)
MPESA_CALLBACK_URL = "https://0a4e14795lb1.ngrok-free.app/api/v1/payments/callbacks/mpesa/"
MPESA_RESULT_URL = "https://0a4e14795lb1.ngrok-free.app/api/v1/payments/callbacks/mpesa/result/"
MPESA_TIMEOUT_URL = "https://0a4e14795lb1.ngrok-free.app/api/v1/payments/callbacks/mpesa/timeout/"

# M-Pesa Transaction Types
MPESA_TRANSACTION_TYPES = {
    'CUSTOMER_PAYBILL_ONLINE': 'CustomerPayBillOnline',
    'CUSTOMER_BUY_GOODS_ONLINE': 'CustomerBuyGoodsOnline',
}

# Test Phone Numbers (Safaricom Sandbox)
MPESA_TEST_PHONE_NUMBERS = [
    "254708374149",  # Test number 1
    "254711599105",  # Test number 2 
    "254714572694",  # Test number 3
]

# Environment Setting
NOWPAYMENTS_ENVIRONMENT = "sandbox"  # Change to "production" when ready

# NOWPayments API URLs
NOWPAYMENTS_BASE_URL = "https://api.nowpayments.io/v1"
NOWPAYMENTS_SANDBOX_URL = "https://api-sandbox.nowpayments.io/v1"

# Conditional Credentials Based on Environment
if NOWPAYMENTS_ENVIRONMENT == "sandbox":
    # Sandbox Credentials
    NOWPAYMENTS_API_KEY = "4CPABGA-7FQ4JTZ-MK9849P-2Y6G1H7"
    NOWPAYMENTS_PUBLIC_KEY = "9491bcbb-124b-4408-890c-1606f079b5e1"
    NOWPAYMENTS_IPN_SECRET = "PA3GoHoV7/YaRBJXKZE0KMcKc3OPK9LV"
else:
    # Production Credentials
    NOWPAYMENTS_API_KEY = "Q00RT89-3HY4FYD-JCK85A9-BZA9MQQ"
    NOWPAYMENTS_PUBLIC_KEY = "fbb86a81-0a77-402d-810b-61405b0d93c0"
    NOWPAYMENTS_IPN_SECRET = "Bw8+guWPMMuw4WdOlApWVbmi1xGotvy0"

# Callback URLs (using your ngrok tunnel)
NOWPAYMENTS_CALLBACK_URL = "https://0a4e14795lb1.ngrok-free.app/api/v1/payments/callbacks/crypto/"

# Supported Cryptocurrencies (NOWPayments has 150+)
SUPPORTED_CRYPTOCURRENCIES = [
    'btc',   # Bitcoin
    'eth',   # Ethereum
    'usdt',  # Tether USD
    'usdc',  # USD Coin
    'ltc',   # Litecoin
    'bch',   # Bitcoin Cash
    'bnb',   # Binance Coin
    'ada',   # Cardano
    'dot',   # Polkadot
    'trx',   # Tron
    'xrp',   # XRP
    'sol',   # Solana
    'matic', # Polygon
    'doge',  # Dogecoin
    'xlm',   # Stellar
]

# Rate Limiting Configuration (used by your middleware)
RATE_LIMITING_SETTINGS = {
    'ANONYMOUS_LIMIT': (100, 3600),      # 100 requests per hour
    'AUTHENTICATED_LIMIT': (1000, 3600), # 1000 requests per hour
    'PREMIUM_LIMIT': (5000, 3600),       # 5000 requests per hour
    'ENTERPRISE_LIMIT': (10000, 3600),   # 10000 requests per hour
}

# Health Check Configuration
HEALTH_CHECK_SETTINGS = {
    'DATABASE_CHECK': True,
    'CACHE_CHECK': True,
    'EXTERNAL_SERVICES_CHECK': False,  # Enable when you have external service dependencies
}

# Pagination Configuration for different view types
PAGINATION_SETTINGS = {
    'STANDARD_PAGE_SIZE': 20,
    'LARGE_PAGE_SIZE': 50,
    'SMALL_PAGE_SIZE': 10,
    'DASHBOARD_PAGE_SIZE': 5,
    'SEARCH_PAGE_SIZE': 15,
    'MAX_PAGE_SIZE': 200,
}
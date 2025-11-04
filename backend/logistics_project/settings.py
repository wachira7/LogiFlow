# backend/logistics_project/settings.py - Updated to use Environment Variables

from pathlib import Path
from datetime import timedelta
import os

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-hg2iqi*hhg=)*_+^3eql!_vxj-_qk#y$(*9ts4p!+-tpl5d%yd')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# Parse allowed hosts from environment
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

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
    'django_celery_beat',
    'django_celery_results',
    
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
    # 'utils.throttling.RequestThrottleMiddleware',
    # 'utils.middleware.RateLimitMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.tenants.middleware.CompanyTenantMiddleware',      
    'apps.tenants.middleware.TenantValidationMiddleware',
    'apps.users.middleware.PlatformAdminProtectionMiddleware',  # new addition   
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'utils.middleware.RequestLoggingMiddleware',
    'utils.middleware.PerformanceMonitoringMiddleware',
    'apps.tenants.middleware.AuditLoggingMiddleware',       
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

# Database Configuration from Environment
DB_ENGINE = os.getenv('DB_ENGINE', 'django.db.backends.sqlite3')

if DB_ENGINE == 'django.db.backends.sqlite3':
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': BASE_DIR / os.getenv('DB_NAME', 'db.sqlite3'),
        }
    }
else:
    # PostgreSQL configuration
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': os.getenv('DB_NAME', 'logiflow_db'),
            'USER': os.getenv('DB_USER', 'logiflow_user'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
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

# Enhanced REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'utils.pagination.StandardPagination',
    'PAGE_SIZE': int(os.getenv('STANDARD_PAGE_SIZE', 20)),
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
    'EXCEPTION_HANDLER': 'utils.exceptions.custom_exception_handler',
}

# JWT Configuration from Environment
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('ACCESS_TOKEN_LIFETIME_MINUTES', 60))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('REFRESH_TOKEN_LIFETIME_DAYS', 7))),
    'ROTATE_REFRESH_TOKENS': os.getenv('ROTATE_REFRESH_TOKENS', 'True').lower() == 'true',
    'BLACKLIST_AFTER_ROTATION': os.getenv('BLACKLIST_AFTER_ROTATION', 'True').lower() == 'true',
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': os.getenv('JWT_ALGORITHM', 'HS256'),
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}


# Parse frontend domain for cookie settings
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
FRONTEND_DOMAIN = os.getenv('FRONTEND_DOMAIN', 'localhost')  # e.g., 'logiflow.com' for production

# Cookie Configuration for Authentication
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_COOKIE_NAME = 'sessionid'

# Set cookie domain only in production
if not DEBUG and FRONTEND_DOMAIN != 'localhost':
    SESSION_COOKIE_DOMAIN = f'.{FRONTEND_DOMAIN}'  # Allows subdomains
    CSRF_COOKIE_DOMAIN = f'.{FRONTEND_DOMAIN}'

# CSRF Cookie Configuration
CSRF_COOKIE_HTTPONLY = False  # Frontend needs to read CSRF token
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_AGE = 31449600  # 1 year

# CSRF Trusted Origins for your frontend
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', FRONTEND_URL).split(',')

# Security Headers (consolidate all security settings here)
if not DEBUG:
    # Production security settings
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() == 'true'
    
    # Force HTTPS for cookies in production
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    # Development settings
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False


# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'LogiFlow API',
    'DESCRIPTION': 'Multi-tenant Logistics Platform API',
    'VERSION': os.getenv('APP_VERSION', '1.0.0'),
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

# CORS Configuration from Environment
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'True').lower() == 'true'
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False').lower() == 'true'

# Cache Configuration from Environment
CACHE_BACKEND = os.getenv('CACHE_BACKEND', 'django.core.cache.backends.locmem.LocMemCache')

if 'redis' in CACHE_BACKEND.lower():
    CACHES = {
        'default': {
            'BACKEND': CACHE_BACKEND,
            'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': CACHE_BACKEND,
            'LOCATION': os.getenv('CACHE_LOCATION', 'unique-snowflake'),
            'TIMEOUT': int(os.getenv('CACHE_TIMEOUT', 300)),
            'OPTIONS': {
                'MAX_ENTRIES': int(os.getenv('CACHE_MAX_ENTRIES', 1000)),
            }
        }
    }

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / os.getenv('STATIC_ROOT', 'staticfiles')
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / os.getenv('MEDIA_ROOT', 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Logging Configuration
log_dir = BASE_DIR / os.getenv('LOG_DIR', 'logs')
log_dir.mkdir(exist_ok=True)

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
            'level': os.getenv('LOG_LEVEL', 'DEBUG'),
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': log_dir / 'development.log',
            'maxBytes': int(os.getenv('LOG_MAX_BYTES', 10485760)),  # 10MB
            'backupCount': int(os.getenv('LOG_BACKUP_COUNT', 5)),
            'formatter': 'verbose',
        },
        'console': {
            'level': os.getenv('LOG_LEVEL', 'DEBUG'),
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'performance': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': log_dir / 'performance.log',
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
            'level': os.getenv('LOG_LEVEL', 'DEBUG'),
            'propagate': False,
        },
        'utils.middleware': {
            'handlers': ['performance', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'payments': {
            'handlers': ['file', 'console'],
            'level': os.getenv('LOG_LEVEL', 'DEBUG'),
            'propagate': False,
        },
    },
}

# Email Configuration from Environment
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'LogiFlow <noreply@logiflow.com>')

# Frontend URL from Environment
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Application Configuration
APP_VERSION = os.getenv('APP_VERSION', '1.0.0')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# Performance Monitoring Settings
STORE_PERFORMANCE_METRICS = os.getenv('STORE_PERFORMANCE_METRICS', 'True').lower() == 'true'
ENABLE_RATE_LIMITING = os.getenv('ENABLE_RATE_LIMITING', 'False').lower() == 'true'

# File Upload Settings from Environment
FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv('FILE_UPLOAD_MAX_MEMORY_SIZE', 10485760))  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv('DATA_UPLOAD_MAX_MEMORY_SIZE', 10485760))  # 10MB

# Security Settings from Environment
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = os.getenv('SECURE_BROWSER_XSS_FILTER', 'True').lower() == 'true'
    SECURE_CONTENT_TYPE_NOSNIFF = os.getenv('SECURE_CONTENT_TYPE_NOSNIFF', 'True').lower() == 'true'
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', 31536000))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'True').lower() == 'true'
    CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'True').lower() == 'true'
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() == 'true'

# Payment Configuration from Environment
# Stripe
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')
STRIPE_API_VERSION = os.getenv('STRIPE_API_VERSION', '2023-10-16')

# M-Pesa
MPESA_CONSUMER_KEY = os.getenv('MPESA_CONSUMER_KEY', '')
MPESA_CONSUMER_SECRET = os.getenv('MPESA_CONSUMER_SECRET', '')
MPESA_ENVIRONMENT = os.getenv('MPESA_ENVIRONMENT', 'sandbox')
MPESA_SHORTCODE = os.getenv('MPESA_SHORTCODE', '174379')
MPESA_PASSKEY = os.getenv('MPESA_PASSKEY', '')

# M-Pesa API URLs
MPESA_BASE_URL = os.getenv('MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke')
MPESA_AUTH_URL = os.getenv('MPESA_AUTH_URL', f"{MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials")
MPESA_STK_PUSH_URL = os.getenv('MPESA_STK_PUSH_URL', f"{MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest")
MPESA_STK_QUERY_URL = os.getenv('MPESA_STK_QUERY_URL', f"{MPESA_BASE_URL}/mpesa/stkpushquery/v1/query")
MPESA_ACCOUNT_BALANCE_URL = os.getenv('MPESA_ACCOUNT_BALANCE_URL', f"{MPESA_BASE_URL}/mpesa/accountbalance/v1/query")

# M-Pesa Callbacks
MPESA_CALLBACK_URL = os.getenv('MPESA_CALLBACK_URL', 'https://your-domain.com/api/v1/payments/callbacks/mpesa/')
MPESA_RESULT_URL = os.getenv('MPESA_RESULT_URL', 'https://your-domain.com/api/v1/payments/callbacks/mpesa/result/')
MPESA_TIMEOUT_URL = os.getenv('MPESA_TIMEOUT_URL', 'https://your-domain.com/api/v1/payments/callbacks/mpesa/timeout/')

# NOWPayments (Crypto)
NOWPAYMENTS_ENVIRONMENT = os.getenv('NOWPAYMENTS_ENVIRONMENT', 'sandbox')
NOWPAYMENTS_API_KEY = os.getenv('NOWPAYMENTS_API_KEY', '')
NOWPAYMENTS_PUBLIC_KEY = os.getenv('NOWPAYMENTS_PUBLIC_KEY', '')
NOWPAYMENTS_IPN_SECRET = os.getenv('NOWPAYMENTS_IPN_SECRET', '')
NOWPAYMENTS_CALLBACK_URL = os.getenv('NOWPAYMENTS_CALLBACK_URL', 'https://your-domain.com/api/v1/payments/callbacks/crypto/')

# NOWPayments URLs
NOWPAYMENTS_BASE_URL = "https://api.nowpayments.io/v1"
NOWPAYMENTS_SANDBOX_URL = "https://api-sandbox.nowpayments.io/v1"

# Supported Cryptocurrencies
SUPPORTED_CRYPTOCURRENCIES = [
    'btc', 'eth', 'usdt', 'usdc', 'ltc', 'bch', 'bnb', 'ada', 'dot', 'trx', 'xrp', 'sol', 'matic', 'doge', 'xlm',
]


# Currency Conversion Configuration
EXCHANGE_RATE_API_KEY = os.getenv('EXCHANGE_RATE_API_KEY', None)  # Optional - uses free API if not set

# Default Exchange Rates (fallback if API fails)
DEFAULT_EXCHANGE_RATES = {
    'KES': 150.0,  # 1 USD = 150 KES
    'EUR': 0.85,   # 1 USD = 0.85 EUR
    'GBP': 0.73,   # 1 USD = 0.73 GBP
    'yen': 110.0,  # 1 USD = 110 yen
    'yuan': 6.5,   # 1 USD = 6.5 yuan
    'rupee': 50.0, # 1 USD = 50 rupees
    'riyal': 3.67, # 1 USD = 3.67 Riyals
    'rub': 60.0,   # 1 USD = 60 rub
}

# Cache duration for exchange rates (in seconds)
EXCHANGE_RATE_CACHE_DURATION = int(os.getenv('EXCHANGE_RATE_CACHE_DURATION', 3600))  # 1 hour

CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')


# Celery Result Backend
CELERY_RESULT_BACKEND = 'django-db'  # Store results in Django database
CELERY_CACHE_BACKEND = 'django-cache'

# Celery Task Settings
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# Celery Beat Settings (for scheduled tasks)
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Task time limits
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25 minutes

# Worker settings
CELERY_WORKER_PREFETCH_MULTIPLIER = 4
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# Task result expiration
CELERY_RESULT_EXPIRES = 3600  # 1 hour

# Rate Limiting Configuration
RATE_LIMITING_SETTINGS = {
    'ANONYMOUS_LIMIT': (300, 3600),     
    'AUTHENTICATED_LIMIT': (2400, 3600),  
    'PREMIUM_LIMIT': (4800, 3600),
    'ENTERPRISE_LIMIT': (9600, 3600),
    'ADMIN_LIMIT': (14400, 3600),
    'BURST_LIMIT': (100, 60),           
    'DAILY_LIMIT': (50000, 86400),      
}

# Health Check Configuration
HEALTH_CHECK_SETTINGS = {
    'DATABASE_CHECK': os.getenv('DATABASE_CHECK', 'True').lower() == 'true',
    'CACHE_CHECK': os.getenv('CACHE_CHECK', 'True').lower() == 'true',
    'EXTERNAL_SERVICES_CHECK': os.getenv('EXTERNAL_SERVICES_CHECK', 'False').lower() == 'true',
}

# Pagination Configuration
PAGINATION_SETTINGS = {
    'STANDARD_PAGE_SIZE': int(os.getenv('STANDARD_PAGE_SIZE', 20)),
    'LARGE_PAGE_SIZE': int(os.getenv('LARGE_PAGE_SIZE', 50)),
    'SMALL_PAGE_SIZE': int(os.getenv('SMALL_PAGE_SIZE', 10)),
    'DASHBOARD_PAGE_SIZE': int(os.getenv('DASHBOARD_PAGE_SIZE', 5)),
    'SEARCH_PAGE_SIZE': int(os.getenv('SEARCH_PAGE_SIZE', 15)),
    'MAX_PAGE_SIZE': int(os.getenv('MAX_PAGE_SIZE', 200)),
}
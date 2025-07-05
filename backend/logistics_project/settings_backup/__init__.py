import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Determine which settings to use based on environment
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development').lower()

if ENVIRONMENT == 'production':
    from .production import *
elif ENVIRONMENT == 'staging':
    from .production import *  # Use production settings for staging
else:
    from .development import *

# Print current environment for debugging
print(f"🔧 Logiflow running in {ENVIRONMENT.upper()} environment")
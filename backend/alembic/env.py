from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

import os
import sys
from dotenv import load_dotenv

from urllib.parse import quote_plus

# Add parent directory to path so we can import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Load environment variables
load_dotenv()

# Import your Base
from app.core.database import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)



# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.
from app.core.database import Base

# Import ALL models so Alembic can detect them
from app.models.user import User
from app.models.role import Role, Permission
from app.models.ingestion_batch import IngestionBatch
from app.models.column_mapping import ColumnMapping
from app.models.campaign import (
    Campaign, 
    Product, 
    CampaignProduct, 
    CampaignChannel, 
    # CampaignEvent
)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    from urllib.parse import quote_plus
    
    # URL-encode password to handle special characters
    password = quote_plus(os.getenv('DB_PASSWORD'))
    url = f"mysql+pymysql://{os.getenv('DB_USER')}:{password}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    from urllib.parse import quote_plus
    
    # URL-encode password to handle special characters
    password = quote_plus(os.getenv('DB_PASSWORD'))
    db_url = f"mysql+pymysql://{os.getenv('DB_USER')}:{password}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}" 
    
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = db_url
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()            


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

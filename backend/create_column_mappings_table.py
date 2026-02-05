"""
Quick script to create column_mappings table
Run once: python create_column_mappings_table.py
"""

from app.core.database import engine
from sqlalchemy import text

# SQL to create table
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS column_mappings (
    mapping_id INT PRIMARY KEY AUTO_INCREMENT,
    batch_id INT NOT NULL,
    original_column_name VARCHAR(255) NOT NULL,
    detected_role VARCHAR(50) NULL,
    confirmed_role VARCHAR(50) NOT NULL,
    user_confirmed BOOLEAN DEFAULT FALSE,
    user_changed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (batch_id) REFERENCES ingestion_batches(batch_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    INDEX idx_batch_id (batch_id),
    INDEX idx_confirmed_role (confirmed_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

def create_table():
    """Create the column_mappings table"""
    
    with engine.connect() as conn:
        try:
            conn.execute(text(CREATE_TABLE_SQL))
            conn.commit()
            print("✅ Table 'column_mappings' created successfully!")
        except Exception as e:
            print(f"❌ Error creating table: {e}")

if __name__ == "__main__":
    create_table()
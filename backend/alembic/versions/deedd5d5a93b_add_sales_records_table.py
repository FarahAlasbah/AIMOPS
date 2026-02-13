"""Add sales_records table

Revision ID: deedd5d5a93b
Revises: 449eb9558ec2
Create Date: 2026-02-13 16:59:18.019111

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'deedd5d5a93b'
down_revision: Union[str, Sequence[str], None] = '449eb9558ec2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create sales_records table
    op.create_table('sales_records',
        sa.Column('record_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('sale_date', sa.Date(), nullable=False),
        sa.Column('quantity', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('unit_price', sa.DECIMAL(precision=10, scale=2), nullable=True),
        sa.Column('total_amount', sa.DECIMAL(precision=10, scale=2), nullable=True),
        sa.Column('discount', sa.DECIMAL(precision=10, scale=2), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('channel', sa.String(length=100), nullable=True),
        sa.Column('customer_id', sa.String(length=100), nullable=True),
        sa.Column('product_code', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('current_timestamp()')),
        sa.ForeignKeyConstraint(['batch_id'], ['ingestion_batches.batch_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.product_id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('record_id')
    )

    # Indexes for sales_records
    op.create_index('idx_batch_product', 'sales_records', ['batch_id', 'product_id'], unique=False)
    op.create_index('idx_date_product', 'sales_records', ['sale_date', 'product_id'], unique=False)
    op.create_index(op.f('ix_sales_records_batch_id'), 'sales_records', ['batch_id'], unique=False)
    op.create_index(op.f('ix_sales_records_product_id'), 'sales_records', ['product_id'], unique=False)
    op.create_index(op.f('ix_sales_records_sale_date'), 'sales_records', ['sale_date'], unique=False)

    # Add normalized_name column to products
    op.add_column('products', sa.Column('normalized_name', sa.String(length=200), nullable=True))
    op.create_index(op.f('ix_products_normalized_name'), 'products', ['normalized_name'], unique=False)


def downgrade() -> None:
    # Remove normalized_name from products
    op.drop_index(op.f('ix_products_normalized_name'), table_name='products')
    op.drop_column('products', 'normalized_name')

    # Remove sales_records indexes
    op.drop_index(op.f('ix_sales_records_sale_date'), table_name='sales_records')
    op.drop_index(op.f('ix_sales_records_product_id'), table_name='sales_records')
    op.drop_index(op.f('ix_sales_records_batch_id'), table_name='sales_records')
    op.drop_index('idx_date_product', table_name='sales_records')
    op.drop_index('idx_batch_product', table_name='sales_records')

    # Drop sales_records table
    op.drop_table('sales_records')
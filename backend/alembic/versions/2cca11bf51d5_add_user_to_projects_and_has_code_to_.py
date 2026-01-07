"""add user to projects and has code to analysis

Revision ID: 2cca11bf51d5
Revises: c4ec5c9bd199
Create Date: 2026-01-07 00:17:34.140533

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '2cca11bf51d5'
down_revision = 'c4ec5c9bd199'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Add has_source_code column as nullable
    op.add_column('error_analysis', sa.Column('has_source_code', sa.Integer(), nullable=True))
    
    # Step 2: Add user_id column as nullable first
    op.add_column('projects', sa.Column('user_id', sa.Integer(), nullable=True))
    
    # Step 3: Assign existing projects to the first user (if any users exist)
    connection = op.get_bind()
    result = connection.execute(text("SELECT id FROM users ORDER BY id LIMIT 1"))
    first_user = result.fetchone()
    
    if first_user:
        # Assign all existing projects to the first user
        connection.execute(text(
            "UPDATE projects SET user_id = :user_id WHERE user_id IS NULL"
        ), {"user_id": first_user[0]})
        
        # Step 4: Make user_id non-nullable
        op.alter_column('projects', 'user_id',
                       existing_type=sa.Integer(),
                       nullable=False)
        
        # Step 5: Create index and foreign key
        op.create_index(op.f('ix_projects_user_id'), 'projects', ['user_id'], unique=False)
        op.create_foreign_key('fk_projects_user_id_users', 'projects', 'users', ['user_id'], ['id'])
    else:
        # If no users exist, keep user_id nullable for now
        # Create index but no foreign key yet
        op.create_index(op.f('ix_projects_user_id'), 'projects', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop foreign key constraint (if it exists)
    try:
        op.drop_constraint('fk_projects_user_id_users', 'projects', type_='foreignkey')
    except:
        pass
    
    # Drop index
    op.drop_index(op.f('ix_projects_user_id'), table_name='projects')
    
    # Drop columns
    op.drop_column('projects', 'user_id')
    op.drop_column('error_analysis', 'has_source_code')


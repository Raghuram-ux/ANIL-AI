import database
from sqlalchemy import text

def add_hnsw_index():
    print("Adding HNSW index to document_chunks.embedding...")
    with database.engine.connect() as conn:
        # Increase maintenance_work_mem for faster index creation
        conn.execute(text("SET maintenance_work_mem = '128MB'"))
        # Create HNSW index for L2 distance
        # m=16, ef_construction=64 are decent defaults for speed/accuracy trade-off
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
            ON document_chunks USING hnsw (embedding vector_l2_ops)
            WITH (m = 16, ef_construction = 64);
        """))
        conn.commit()
    print("HNSW index created successfully!")

if __name__ == "__main__":
    add_hnsw_index()

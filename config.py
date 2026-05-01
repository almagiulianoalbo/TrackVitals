import os
from supabase import create_client, Client

def get_supabase() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError(
            "Faltan SUPABASE_URL o SUPABASE_KEY en el archivo .env"
        )

    return create_client(supabase_url, supabase_key)
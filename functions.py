# import psycopg2
# import os
# from dotenv import load_dotenv
# import pandas as pd
#
# # Load environment variables from .env file
# load_dotenv()
#
# # =====================================
# # CONEXIÓN Y EJECUCIÓN DE QUERIES
# # =====================================
# def connect_to_supabase():
#     """
#     Conecta a la base de datos de Supabase.
#     """
#     try:
#         host = os.getenv("SUPABASE_DB_HOST")
#         port = os.getenv("SUPABASE_DB_PORT")
#         dbname = os.getenv("SUPABASE_DB_NAME")
#         user = os.getenv("SUPABASE_DB_USER")
#         password = os.getenv("SUPABASE_DB_PASSWORD")
#
#         if not all([host, port, dbname, user, password]):
#             print("Error: faltan variables de entorno para la conexión.")
#             return None
#
#         conn = psycopg2.connect(
#             host=host,
#             port=port,
#             dbname=dbname,
#             user=user,
#             password=password,
#         )
#         return conn
#     except psycopg2.Error as e:
#         print(f"Error conectando a Supabase: {e}")
#         return None
#
# def execute_query(query, conn=None, is_select=True, params=None, commit=True):
#     """
#     Ejecuta una query SQL. Devuelve un DataFrame si es SELECT,
#     o True/False si es DML (INSERT, UPDATE, DELETE).
#     """
#     try:
#         close_conn = False
#         if conn is None:
#             conn = connect_to_supabase()
#             close_conn = True
#
#         cursor = conn.cursor()
#         if params:
#             cursor.execute(query, params)
#         else:
#             cursor.execute(query)
#
#         if is_select:
#             results = cursor.fetchall()
#             colnames = [desc[0] for desc in cursor.description]
#             df = pd.DataFrame(results, columns=colnames)
#             result = df
#         else:
#             if commit:
#                 conn.commit()
#             result = True
#
#         cursor.close()
#         if close_conn:
#             conn.close()
#
#         return result
#     except Exception as e:
#         print(f"Error ejecutando query: {e}")
#         if conn and not is_select:
#             conn.rollback()
#         return pd.DataFrame() if is_select else False
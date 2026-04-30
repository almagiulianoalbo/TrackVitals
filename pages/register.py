import streamlit as st
from config import get_supabase
import base64

def show():

    def img_to_base64(path):
        with open(path, "rb") as img:
            return base64.b64encode(img.read()).decode()

    logo_base64 = img_to_base64("info/logo.png")

    st.markdown("""
    <style>

    .stApp {
        background: #ffffff;
    }

    .logo-container {
        text-align: center;
        margin-top: 30px;
    }

    .logo-container img {
        width: 70px;
        border-radius: 16px;
    }

    .title {
        text-align: center;
        font-size: 1.8rem;
        font-weight: 700;
        margin-top: 10px;
    }

    .subtitle {
        text-align: center;
        color: #6b7280;
        font-size: 0.9rem;
        margin-bottom: 20px;
    }

    .card {
        background: #f9fafb;
        padding: 20px;
        border-radius: 16px;
        border: 1px solid #e5e7eb;
    }

    .stButton > button {
        background: linear-gradient(135deg, #0f766e, #115e59) !important;
        color: white !important;
        border-radius: 14px !important;
        height: 50px !important;
        font-weight: 700 !important;
    }

    </style>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1.2, 1, 1.2])

    with col2:

        st.markdown(f"""
        <div class="logo-container">
            <img src="data:image/png;base64,{logo_base64}">
        </div>
        <div class="title">Crea tu cuenta</div>
        <div class="subtitle">
            Tu bienestar comienza con datos precisos y acompañamiento clínico.
        </div>
        """, unsafe_allow_html=True)

        rol = st.radio(
            "Elegí tu rol",
            ["👨‍⚕️ Médico", "👤 Paciente"],
            horizontal=True
        )

        rol_limpio = "medico" if "Médico" in rol else "paciente"

        nombre = st.text_input("Nombre completo")

        email = st.text_input("Correo electrónico")

        password = st.text_input("Contraseña", type="password")

        confirm = st.text_input("Confirmar contraseña", type="password")

        if st.button("Crear cuenta →", use_container_width=True):

            if not nombre or not email or not password:
                st.error("Completá todos los campos.")
                return

            if password != confirm:
                st.error("Las contraseñas no coinciden.")
                return

            if len(password) < 6:
                st.error("La contraseña debe tener al menos 6 caracteres.")
                return

            _register(nombre, email, password, rol_limpio)

        if st.button("← Volver al login"):
            st.session_state.auth_screen = "login"
            st.rerun()


def _register(nombre, email, password, rol):

    try:
        sb = get_supabase()

        if rol == "paciente":
            sb.table("pacientes").insert({
                "nombre": nombre,
                "email": email,
                "password_pac": password
            }).execute()

        else:
            sb.table("medicos").insert({
                "nombre": nombre,
                "email": email,
                "password_med": password
            }).execute()

        st.success("Cuenta creada con éxito 🎉")

        st.session_state.auth_screen = "login"
        st.rerun()

    except Exception as e:
        st.error("Error al crear la cuenta.")
        st.caption(str(e))
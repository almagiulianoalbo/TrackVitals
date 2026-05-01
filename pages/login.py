import streamlit as st
import base64
from config import get_supabase

def show():
    def img_to_base64(path):
        with open(path, "rb") as img:
            return base64.b64encode(img.read()).decode()

    logo_base64 = img_to_base64("info/logo.png")

    st.markdown(f"""
    <style>

    .stApp {{
        background: #ffffff;
    }}

    .hero-card, .login-card {{
        display: none !important;
    }}

    .logo-container {{
        text-align: center;
        margin-top: 30px;
        margin-bottom: 0px;
    }}

    .logo-container img {{
        width: 255px;
        max-width: 100%;
        pointer-events: none;
        user-select: none;
    }}

    .login-subtitle {{
        text-align: center;
        color: #6b7280;
        font-size: 0.95rem;
        margin-top: -6px;
        margin-bottom: 16px;
    }}

    .section-label {{
        text-align: center;
        font-size: 0.78rem;
        color: #64748b;
        font-weight: 700;
        letter-spacing: 1.8px;
        margin: 10px 0 8px 0;
        text-transform: uppercase;
    }}

    div[data-testid="stRadio"] {{
        background: #f7f9fc;
        padding: 8px;
        border-radius: 16px;
        border: 1.5px solid #e0e7ef;
        margin: 0 auto 14px auto;
        display: flex;
        justify-content: center;
    }}

    div[data-testid="stRadio"] > div {{
        justify-content: center;
        gap: 14px;
        width: 100%;
    }}

    div[data-testid="stRadio"] label {{
        background: white;
        border-radius: 13px;
        padding: 8px 16px;
        border: 1px solid transparent;
        min-width: 130px;
        justify-content: center;
    }}

    div[data-testid="stRadio"] label:hover {{
        border-color: #90caf9;
        background: #f1f7ff;
    }}

    .stTextInput input {{
        border-radius: 14px !important;
        border: 1.5px solid #d6e8fb !important;
        background: #fbfdff !important;
        height: 46px;
    }}

    .stTextInput input:focus {{
        border-color: #1976d2 !important;
        box-shadow: 0 0 0 3px rgba(25,118,210,0.12) !important;
    }}

    .stButton > button {{
        background: linear-gradient(135deg, #1976d2, #0d47a1) !important;
        color: white !important;
        border: none !important;
        border-radius: 15px !important;
        height: 50px !important;
        font-weight: 800 !important;
        font-size: 1rem !important;
        box-shadow: 0 10px 24px rgba(25,118,210,0.24) !important;
    }}

    .stButton > button:hover {{
        background: linear-gradient(135deg, #1565c0, #08306b) !important;
        transform: translateY(-1px);
    }}

    .auth-footer {{
        text-align: center;
        margin-top: 18px;
        color: #9ca3af;
        font-size: 0.76rem;
        line-height: 1.4;
    }}

    </style>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1.25, 1, 1.25])

    with col2:
        st.markdown(f"""
        <div class="logo-container">
            <img src="data:image/png;base64,{logo_base64}">
        </div>
        <div class="login-subtitle">
            Iniciá sesión para acceder a tu panel de salud
        </div>
        """, unsafe_allow_html=True)

        st.markdown("<div class='section-label'>Soy</div>", unsafe_allow_html=True)

        rol = st.radio(
            "",
            ["👤  Paciente", "👨‍⚕️  Médico"],
            horizontal=True,
            label_visibility="collapsed"
        )

        rol_limpio = "paciente" if "Paciente" in rol else "medico"

        if rol_limpio == "paciente":
            email = st.text_input("Correo electrónico", placeholder="tu@email.com", key="email_pac")
            password = st.text_input("Contraseña", type="password", placeholder="••••••••", key="pass_pac")
        else:
            email = st.text_input("Correo electrónico", placeholder="medico@trackvitals.com", key="email_med")
            password = st.text_input("Contraseña", type="password", placeholder="••••••••", key="pass_med")

        if st.button("Iniciar sesión →", use_container_width=True):
            if not email or not password:
                st.error("Completá email y contraseña.")
                return

            _login(email.strip(), password.strip(), rol_limpio)

        st.markdown("<br>", unsafe_allow_html=True)

        st.markdown(
            "<div style='text-align:center; color:#64748b; font-size:0.88rem;'>¿No tenés cuenta?</div>",
            unsafe_allow_html=True
        )

        if st.button("Registrate", use_container_width=True):
            st.session_state.auth_screen = "register"
            st.rerun()

        if st.button("Recuperar contraseña", use_container_width=True):
            st.warning("Todavía no armamos esta pantalla. La hacemos después del registro.")

        st.markdown("""
        <div class="auth-footer">
            Track Vitals · Ciencia de Datos para la Medicina<br>
            Giuliano Albo · Piñeiro · Tobalina
        </div>
        """, unsafe_allow_html=True)


def _login(email: str, password: str, rol: str):
    try:
        sb = get_supabase()

        if rol == "paciente":
            res = (
                sb.table("pacientes")
                .select("*")
                .eq("email", email)
                .eq("password_pac", password)
                .execute()
            )

            if res.data:
                u = res.data[0]
                st.session_state.logged_in = True
                st.session_state.rol = "paciente"
                st.session_state.usuario = u
                st.rerun()
            else:
                st.error("Email o contraseña incorrectos.")

        else:
            res = (
                sb.table("medicos")
                .select("*")
                .eq("email", email)
                .eq("password_med", password)
                .execute()
            )

            if res.data:
                u = res.data[0]
                st.session_state.logged_in = True
                st.session_state.rol = "medico"
                st.session_state.usuario = u
                st.rerun()
            else:
                st.error("Email o contraseña incorrectos.")

    except Exception as e:
        st.error("Error de conexión con la base de datos.")
        st.caption(str(e))
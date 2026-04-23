import streamlit as st
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(
    page_title="Track Vitals",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ── Estilos globales ──────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

* { font-family: 'DM Sans', sans-serif; }

/* Fondo general */
.stApp { background: #f0f7f4; }

/* Ocultar header de streamlit */
header[data-testid="stHeader"] { background: transparent; }
.stDeployButton { display: none; }
#MainMenu { display: none; }
footer { display: none; }

/* Tarjeta hero login */
.hero-card {
    background: white;
    border-radius: 24px;
    padding: 48px;
    box-shadow: 0 4px 40px rgba(25, 135, 84, 0.10);
    border: 1.5px solid #e0f0e8;
    max-width: 460px;
    margin: 0 auto;
}

/* Logo header */
.logo-header {
    text-align: center;
    margin-bottom: 32px;
}
.logo-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1565c0;
    margin: 0;
    letter-spacing: -0.5px;
}
.logo-title span { color: #2e7d32; }
.logo-subtitle {
    font-size: 0.85rem;
    color: #888;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 4px;
}

/* Botones de rol */
.role-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-radius: 14px;
    border: 2px solid #e0f0e8;
    background: #f8fffe;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 12px;
    width: 100%;
    font-size: 1rem;
    font-weight: 500;
    color: #2e7d32;
}
.role-btn:hover { border-color: #2e7d32; background: #e8f5e9; }
.role-btn.active { border-color: #1565c0; background: #e3f2fd; color: #1565c0; }

/* Métricas dashboard */
.metric-card {
    background: white;
    border-radius: 16px;
    padding: 20px 24px;
    border: 1.5px solid #e0f0e8;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.metric-value {
    font-size: 2.2rem;
    font-weight: 700;
    color: #1565c0;
    line-height: 1;
}
.metric-label {
    font-size: 0.8rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
}
.metric-sub {
    font-size: 0.85rem;
    color: #555;
    margin-top: 8px;
}

/* Sidebar */
section[data-testid="stSidebar"] {
    background: white;
    border-right: 1.5px solid #e0f0e8;
}
section[data-testid="stSidebar"] .stButton button {
    background: transparent;
    border: none;
    color: #444;
    text-align: left;
    padding: 10px 16px;
    border-radius: 10px;
    width: 100%;
    font-size: 0.95rem;
}
section[data-testid="stSidebar"] .stButton button:hover {
    background: #e8f5e9;
    color: #2e7d32;
}

/* Inputs */
.stTextInput input, .stSelectbox select {
    border-radius: 10px !important;
    border: 1.5px solid #e0f0e8 !important;
}
.stTextInput input:focus { border-color: #2e7d32 !important; }

/* Botón primario */
.stButton > button {
    background: #2e7d32 !important;
    color: white !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 10px 24px !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    transition: all 0.2s !important;
}
.stButton > button:hover {
    background: #1b5e20 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(46,125,50,0.3) !important;
}

/* Alertas */
.alerta-alta {
    background: #fff3e0;
    border-left: 4px solid #f57c00;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 8px;
}
.alerta-baja {
    background: #fce4ec;
    border-left: 4px solid #c62828;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 8px;
}

/* Tabs */
.stTabs [data-baseweb="tab"] {
    font-weight: 500;
    color: #666;
}
.stTabs [aria-selected="true"] {
    color: #2e7d32 !important;
    border-bottom-color: #2e7d32 !important;
}

/* Sección header */
.section-header {
    font-size: 1.3rem;
    font-weight: 600;
    color: #1a3a2a;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Badge de estado */
.badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}
.badge-ok { background: #e8f5e9; color: #2e7d32; }
.badge-warn { background: #fff3e0; color: #e65100; }
.badge-danger { background: #fce4ec; color: #c62828; }
</style>
""", unsafe_allow_html=True)

# ── Inicializar session state ─────────────────────────────────────────────────
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "rol" not in st.session_state:
    st.session_state.rol = None
if "usuario" not in st.session_state:
    st.session_state.usuario = None
if "pagina" not in st.session_state:
    st.session_state.pagina = "dashboard"

# ── Importar páginas ──────────────────────────────────────────────────────────
from pages import login, paciente_dashboard, medico_dashboard

# ── Router principal ──────────────────────────────────────────────────────────
if not st.session_state.logged_in:
    login.show()
else:
    if st.session_state.rol == "paciente":
        paciente_dashboard.show()
    elif st.session_state.rol == "medico":
        medico_dashboard.show()

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(
    page_title="Track Vitals",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="collapsed"
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

* {
    font-family: 'Sora', sans-serif;
    box-sizing: border-box;
}

/* ── App background ── */
.stApp {
    background: #f0f4f8;
    background-image:
        radial-gradient(ellipse 80% 50% at 20% -10%, rgba(13,71,161,0.10) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 110%, rgba(21,101,192,0.08) 0%, transparent 60%);
    min-height: 100vh;
}

/* ── Hide Streamlit chrome ── */
header[data-testid="stHeader"]   { background: transparent; }
.stDeployButton                  { display: none !important; }
#MainMenu                        { display: none !important; }
footer                           { display: none !important; }

/* ── Sidebar ── */
section[data-testid="stSidebar"] {
    background: #0d1b3e;
    border-right: none;
}

section[data-testid="stSidebar"] .stButton button {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.70);
    text-align: left;
    padding: 10px 16px;
    border-radius: 10px;
    width: 100%;
    font-size: 0.92rem;
    font-family: 'Sora', sans-serif;
    font-weight: 500;
    transition: all 0.18s ease;
}

section[data-testid="stSidebar"] .stButton button:hover {
    background: rgba(255,255,255,0.09);
    color: white;
}

/* ── Global button ── */
.stButton > button {
    background: linear-gradient(135deg, #1565c0, #0d47a1) !important;
    color: white !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 10px 24px !important;
    font-weight: 700 !important;
    font-size: 0.93rem !important;
    font-family: 'Sora', sans-serif !important;
    letter-spacing: 0.3px !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 4px 14px rgba(13,71,161,0.28) !important;
}

.stButton > button:hover {
    background: linear-gradient(135deg, #0d47a1, #08306b) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(13,71,161,0.38) !important;
}

/* ── Inputs ── */
.stTextInput input,
.stSelectbox select {
    border-radius: 11px !important;
    border: 1.5px solid #dbe6f5 !important;
    background: #f8fbff !important;
    font-family: 'Sora', sans-serif !important;
    font-size: 0.92rem !important;
    color: #1a2744 !important;
    height: 46px !important;
    padding: 0 14px !important;
    transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
}

.stTextInput input:focus {
    border-color: #1565c0 !important;
    box-shadow: 0 0 0 3px rgba(21,101,192,0.13) !important;
    background: white !important;
}

/* ── Tabs ── */
.stTabs [data-baseweb="tab"] {
    font-weight: 600;
    font-family: 'Sora', sans-serif;
    color: #64748b;
    font-size: 0.90rem;
}

.stTabs [aria-selected="true"] {
    color: #1565c0 !important;
    border-bottom-color: #1565c0 !important;
}

/* ── Metric cards ── */
.metric-card {
    background: white;
    border-radius: 18px;
    padding: 22px 26px;
    border: 1.5px solid #e5eef8;
    box-shadow: 0 2px 16px rgba(13,71,161,0.06);
}

.metric-value {
    font-size: 2.4rem;
    font-weight: 800;
    color: #0d47a1;
    line-height: 1;
    letter-spacing: -1px;
}

.metric-label {
    font-size: 0.72rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-top: 5px;
    font-weight: 600;
}

.metric-sub {
    font-size: 0.84rem;
    color: #475569;
    margin-top: 9px;
}

/* ── Alerts ── */
.alerta-alta {
    background: #fff8e1;
    border-left: 4px solid #f59e0b;
    border-radius: 10px;
    padding: 13px 16px;
    margin-bottom: 8px;
    font-size: 0.88rem;
}

.alerta-baja {
    background: #fff1f2;
    border-left: 4px solid #e11d48;
    border-radius: 10px;
    padding: 13px 16px;
    margin-bottom: 8px;
    font-size: 0.88rem;
}

/* ── Badges ── */
.badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.73rem;
    font-weight: 700;
    letter-spacing: 0.4px;
}

.badge-ok     { background: #e0f2fe; color: #0369a1; }
.badge-warn   { background: #fef9c3; color: #a16207; }
.badge-danger { background: #ffe4e6; color: #be123c; }

/* ── Section header ── */
.section-header {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0d1b3e;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 9px;
    letter-spacing: -0.3px;
}

/* ── Hero / login card shell ── */
.hero-card {
    background: white;
    border-radius: 24px;
    padding: 48px;
    box-shadow: 0 6px 48px rgba(13,71,161,0.12);
    border: 1.5px solid #e5eef8;
    max-width: 460px;
    margin: 0 auto;
}
</style>
""", unsafe_allow_html=True)

# ── Session state defaults ──────────────────────────────────────────────────
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if "rol" not in st.session_state:
    st.session_state.rol = None

if "usuario" not in st.session_state:
    st.session_state.usuario = None

if "pagina" not in st.session_state:
    st.session_state.pagina = "dashboard"

if "auth_screen" not in st.session_state:
    st.session_state.auth_screen = "login"

# ── Routing ─────────────────────────────────────────────────────────────────
from pages import login, register, paciente_dashboard, medico_dashboard

if not st.session_state.logged_in:

    if st.session_state.auth_screen == "login":
        login.show()

    elif st.session_state.auth_screen == "register":
        register.show()

    else:
        login.show()

else:

    if st.session_state.rol == "paciente":
        paciente_dashboard.show()

    elif st.session_state.rol == "medico":
        medico_dashboard.show()
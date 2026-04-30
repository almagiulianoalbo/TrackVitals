import streamlit as st

PRIMARY = "#1769aa"
PRIMARY_DARK = "#0d47a1"
PRIMARY_LIGHT = "#eaf4ff"
BG = "#f4fbfa"

def inject_styles():
    st.markdown(f"""
    <style>
    .stApp {{
        background-color: {BG};
    }}

    .auth-card {{
        background: white;
        padding: 28px;
        border-radius: 18px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        border: 1px solid #e6eef2;
    }}

    .logo-box {{
        width: 58px;
        height: 58px;
        margin: 0 auto 12px auto;
        border-radius: 14px;
        background: linear-gradient(135deg, {PRIMARY}, {PRIMARY_DARK});
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
    }}

    .auth-title {{
        text-align: center;
        color: #1f2937;
        font-size: 28px;
        font-weight: 800;
        margin-bottom: 6px;
    }}

    .auth-subtitle {{
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        margin-bottom: 24px;
    }}

    div.stButton > button {{
        background: linear-gradient(135deg, {PRIMARY}, {PRIMARY_DARK});
        color: white;
        border: none;
        border-radius: 12px;
        height: 48px;
        font-weight: 700;
        box-shadow: 0 6px 16px rgba(23,105,170,0.25);
    }}

    div.stButton > button:hover {{
        background: {PRIMARY_DARK};
        color: white;
    }}
    </style>
    """, unsafe_allow_html=True)
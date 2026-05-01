import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from config import get_supabase
from datetime import datetime

AZUL = "#1565c0"
VERDE = "#2e7d32"
VERDE_CLARO = "#e8f5e9"
NARANJA = "#f57c00"
ROJO = "#c62828"

def show():
    u = st.session_state.usuario
    sb = get_supabase()

    # ── Sidebar ───────────────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown(f"""
        <div style='padding: 20px 8px 8px 8px;'>
            <div style='font-size:1.5rem; font-weight:700; color:{AZUL};'>TRACK <span style='color:{VERDE};'>VITALS</span></div>
            <div style='font-size:0.75rem; color:#888; letter-spacing:2px; margin-bottom:16px;'>— built for diabetics —</div>
            <div style='background:#e3f2fd; border-radius:12px; padding:12px; margin-bottom:20px;'>
                <div style='font-weight:600; color:{AZUL};'>👨‍⚕️ Dr/a. {u["nombre"]} {u["apellido"]}</div>
                <div style='font-size:0.8rem; color:#555;'>Mat. {u.get("matricula","")}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        paginas = {
            "📊 Panel principal": "dashboard",
            "👥 Mis pacientes": "pacientes",
            "📅 Mis turnos": "turnos",
            "💊 Cargar prescripción": "prescripcion",
        }
        for label, key in paginas.items():
            if st.button(label, key=f"nav_med_{key}", use_container_width=True):
                st.session_state.pagina = key
                st.session_state.paciente_sel = None
                st.rerun()

        st.markdown("---")
        if st.button("🚪 Cerrar sesión", use_container_width=True):
            st.session_state.logged_in = False
            st.session_state.usuario = None
            st.session_state.rol = None
            st.rerun()

    pagina = st.session_state.get("pagina", "dashboard")

    if pagina == "dashboard":
        _panel_medico(u, sb)
    elif pagina == "pacientes":
        _mis_pacientes(u, sb)
    elif pagina == "turnos":
        _turnos_medico(u, sb)
    elif pagina == "prescripcion":
        _cargar_prescripcion(u, sb)


# ── PANEL MÉDICO ──────────────────────────────────────────────────────────────
def _panel_medico(u, sb):
    id_med = u["id_medico"]

    st.markdown(f"<h2 style='color:{AZUL}; margin-bottom:4px;'>Bienvenido/a, Dr/a. {u['nombre']} 👋</h2>", unsafe_allow_html=True)
    st.markdown(f"<p style='color:#888; margin-bottom:24px;'>{datetime.now().strftime('%A %d de %B, %Y')}</p>", unsafe_allow_html=True)

    # Métricas generales
    pacientes = sb.table("pacientes").select("*").eq("id_medico_cabecera", id_med).execute()
    n_pac = len(pacientes.data) if pacientes.data else 0

    turnos_hoy = sb.table("turnos").select("*").eq("id_medico", id_med).eq("estado", "pendiente").execute()
    n_turnos = len(turnos_hoy.data) if turnos_hoy.data else 0

    alertas_abiertas = 0
    if pacientes.data:
        for p in pacientes.data:
            a = sb.table("alerta").select("id_alerta").eq("id_paciente", p["id_paciente"]).eq("vista", False).execute()
            alertas_abiertas += len(a.data) if a.data else 0

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Mis pacientes</div>
            <div class='metric-value' style='color:{AZUL};'>{n_pac}</div>
            <div class='metric-sub'>pacientes a cargo</div>
        </div>""", unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Turnos pendientes</div>
            <div class='metric-value' style='color:{NARANJA};'>{n_turnos}</div>
            <div class='metric-sub'>por confirmar</div>
        </div>""", unsafe_allow_html=True)
    with col3:
        color_a = ROJO if alertas_abiertas > 0 else VERDE
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Alertas abiertas</div>
            <div class='metric-value' style='color:{color_a};'>{alertas_abiertas}</div>
            <div class='metric-sub'>{'⚠️ Requieren atención' if alertas_abiertas > 0 else '✅ Sin alertas'}</div>
        </div>""", unsafe_allow_html=True)

    # Lista rápida de pacientes con alertas
    if alertas_abiertas > 0 and pacientes.data:
        st.markdown("<div style='margin-top:24px;'></div>", unsafe_allow_html=True)
        st.markdown(f"<div class='section-header'>⚠️ Pacientes con alertas activas</div>", unsafe_allow_html=True)
        for p in pacientes.data:
            a = sb.table("alerta").select("*").eq("id_paciente", p["id_paciente"]).eq("vista", False).execute()
            if a.data:
                for alerta in a.data:
                    tipo = alerta.get("tipo","")
                    clase = "alerta-baja" if "baja" in tipo else "alerta-alta"
                    st.markdown(f"""
                    <div class='{clase}'>
                        <b>{p['nombre']} {p['apellido']}</b> — {tipo.replace("_"," ").title()}:
                        {alerta.get('valor_disparador','')} mg/dL
                        <span style='float:right; font-size:0.8rem;'>{alerta.get('fecha','')[:16]}</span>
                    </div>""", unsafe_allow_html=True)

    # Próximos turnos
    if turnos_hoy.data:
        st.markdown("<div style='margin-top:24px;'></div>", unsafe_allow_html=True)
        st.markdown(f"<div class='section-header'>📅 Turnos pendientes de confirmación</div>", unsafe_allow_html=True)
        for t in turnos_hoy.data[:5]:
            pac_info = sb.table("pacientes").select("nombre, apellido").eq("id_paciente", t["id_paciente"]).execute()
            pac_nombre = f"{pac_info.data[0]['nombre']} {pac_info.data[0]['apellido']}" if pac_info.data else "—"
            col_t, col_b = st.columns([3, 1])
            with col_t:
                st.markdown(f"""
                <div class='metric-card'>
                    <b>{pac_nombre}</b> · {t.get('fecha_hora','')[:16]}
                    <div style='color:#666; font-size:0.85rem;'>{t.get('motivo','')}</div>
                </div>""", unsafe_allow_html=True)
            with col_b:
                if st.button("✅ Confirmar", key=f"conf_{t['id_turno']}"):
                    sb.table("turnos").update({"estado": "confirmado"}).eq("id_turno", t["id_turno"]).execute()
                    st.rerun()


# ── MIS PACIENTES ─────────────────────────────────────────────────────────────
def _mis_pacientes(u, sb):
    id_med = u["id_medico"]
    st.markdown(f"<div class='section-header'>👥 Mis pacientes</div>", unsafe_allow_html=True)

    pacientes = sb.table("pacientes").select("*").eq("id_medico_cabecera", id_med).execute()
    if not pacientes.data:
        st.info("No tenés pacientes asignados.")
        return

    # Selector de paciente
    opciones = {f"{p['nombre']} {p['apellido']} ({p.get('tipo_diabetes','')})": p for p in pacientes.data}
    sel = st.selectbox("Seleccioná un paciente", list(opciones.keys()))
    p = opciones[sel]
    pid = p["id_paciente"]

    st.markdown("<div style='margin-top:16px;'></div>", unsafe_allow_html=True)

    # Info básica
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Paciente</div>
            <div style='font-size:1.1rem; font-weight:600; color:{AZUL}; margin-top:6px;'>{p['nombre']} {p['apellido']}</div>
            <div style='font-size:0.85rem; color:#666;'>DNI: {p.get('dni','')} · {p.get('sexo','')}</div>
            <div style='font-size:0.85rem; color:#666;'>📧 {p.get('email','')}</div>
        </div>""", unsafe_allow_html=True)
    with col2:
        hc = sb.table("historia_clinica").select("*").eq("id_paciente", pid).execute()
        if hc.data:
            h = hc.data[0]
            imc = round(h['peso'] / ((h['altura']/100)**2), 1) if h.get('peso') and h.get('altura') else "—"
            st.markdown(f"""
            <div class='metric-card'>
                <div class='metric-label'>Historia clínica</div>
                <div style='margin-top:6px; font-size:0.9rem; color:#444;'>
                    ⚖️ {h.get('peso','')} kg &nbsp;·&nbsp; 📏 {h.get('altura','')} cm<br>
                    📊 IMC: {imc}<br>
                    🩺 {h.get('tipo_diabetes','')}
                </div>
            </div>""", unsafe_allow_html=True)
    with col3:
        alertas = sb.table("alerta").select("*").eq("id_paciente", pid).eq("vista", False).execute()
        n_a = len(alertas.data) if alertas.data else 0
        color_a = ROJO if n_a > 0 else VERDE
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Alertas activas</div>
            <div class='metric-value' style='color:{color_a};'>{n_a}</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("<div style='margin-top:20px;'></div>", unsafe_allow_html=True)

    # Gráfico glucemia del paciente
    regs = sb.table("registros_diarios").select("*").eq("id_paciente", pid).order("fecha_hora").execute()
    if regs.data:
        df = pd.DataFrame(regs.data)
        df["fecha_hora"] = pd.to_datetime(df["fecha_hora"])
        df_g = df[df["glucemia_mgdl"] > 0]

        st.markdown(f"<div class='section-header'>📈 Glucemia de {p['nombre']}</div>", unsafe_allow_html=True)
        fig = go.Figure()
        fig.add_hrect(y0=70, y1=180, fillcolor="rgba(46,125,50,0.07)", line_width=0)
        fig.add_trace(go.Scatter(
            x=df_g["fecha_hora"], y=df_g["glucemia_mgdl"],
            mode="lines+markers", name="Glucemia",
            line=dict(color=AZUL, width=2),
            marker=dict(size=4),
            hovertemplate="<b>%{y} mg/dL</b><br>%{x}<extra></extra>"
        ))
        fig.update_layout(
            paper_bgcolor="white", plot_bgcolor="white", height=280,
            margin=dict(l=20,r=20,t=20,b=20),
            xaxis=dict(showgrid=False),
            yaxis=dict(gridcolor="#f0f0f0", title="mg/dL"),
            font=dict(family="DM Sans")
        )
        st.plotly_chart(fig, use_container_width=True)

        # Stats rápidas
        col_s1, col_s2, col_s3 = st.columns(3)
        glucemias = df_g["glucemia_mgdl"]
        with col_s1:
            st.metric("Promedio", f"{round(glucemias.mean(),1)} mg/dL")
        with col_s2:
            st.metric("Mínima", f"{glucemias.min()} mg/dL")
        with col_s3:
            st.metric("Máxima", f"{glucemias.max()} mg/dL")

    # Medicamentos del paciente
    meds = sb.table("medicamentos").select("*").eq("id_paciente", pid).execute()
    if meds.data:
        st.markdown("<div style='margin-top:20px;'></div>", unsafe_allow_html=True)
        st.markdown(f"<div class='section-header'>💊 Medicamentos actuales</div>", unsafe_allow_html=True)
        df_m = pd.DataFrame(meds.data)[["nombre","dosis","unidad","frecuencia","fecha_inicio","estado"]]
        df_m.columns = ["Medicamento","Dosis","Unidad","Frecuencia","Desde","Estado"]
        st.dataframe(df_m, use_container_width=True, hide_index=True)


# ── TURNOS MÉDICO ─────────────────────────────────────────────────────────────
def _turnos_medico(u, sb):
    id_med = u["id_medico"]
    st.markdown(f"<div class='section-header'>📅 Mis turnos</div>", unsafe_allow_html=True)

    res = sb.table("turnos").select("*, pacientes(nombre, apellido)").eq("id_medico", id_med).order("fecha_hora", desc=True).execute()
    if not res.data:
        st.info("No tenés turnos registrados.")
        return

    filtro = st.selectbox("Filtrar por estado", ["Todos", "pendiente", "confirmado", "realizado", "cancelado"])
    datos = res.data if filtro == "Todos" else [t for t in res.data if t.get("estado") == filtro]

    colores = {"confirmado": "badge-ok", "pendiente": "badge-warn", "cancelado": "badge-danger", "realizado": "badge-ok"}
    for t in datos:
        pac = t.get("pacientes") or {}
        estado = t.get("estado","")
        col_t, col_b = st.columns([4, 1])
        with col_t:
            st.markdown(f"""
            <div class='metric-card' style='margin-bottom:8px;'>
                <div style='display:flex; justify-content:space-between; align-items:center;'>
                    <div>
                        <b>{pac.get('nombre','')} {pac.get('apellido','')}</b>
                        · <span style='color:#888;'>{t.get('fecha_hora','')[:16]}</span>
                        <span class='badge {colores.get(estado,"badge-warn")}' style='margin-left:8px;'>{estado}</span>
                    </div>
                </div>
                <div style='color:#666; font-size:0.85rem; margin-top:4px;'>📝 {t.get('motivo','')}</div>
            </div>""", unsafe_allow_html=True)
        with col_b:
            if estado == "pendiente":
                if st.button("✅", key=f"ok_{t['id_turno']}", help="Confirmar"):
                    sb.table("turnos").update({"estado":"confirmado"}).eq("id_turno", t["id_turno"]).execute()
                    st.rerun()


# ── CARGAR PRESCRIPCIÓN ───────────────────────────────────────────────────────
def _cargar_prescripcion(u, sb):
    id_med = u["id_medico"]
    st.markdown(f"<div class='section-header'>💊 Cargar prescripción</div>", unsafe_allow_html=True)

    pacientes = sb.table("pacientes").select("id_paciente, nombre, apellido").eq("id_medico_cabecera", id_med).execute()
    if not pacientes.data:
        st.info("No tenés pacientes asignados.")
        return

    opciones = {f"{p['nombre']} {p['apellido']}": p["id_paciente"] for p in pacientes.data}
    pac_sel = st.selectbox("Paciente", list(opciones.keys()))
    pid = opciones[pac_sel]

    col1, col2 = st.columns(2)
    with col1:
        nombre_med = st.text_input("Medicamento", placeholder="Ej: Metformina")
        dosis = st.number_input("Dosis", min_value=0.0, step=0.5)
        unidad = st.selectbox("Unidad", ["mg", "UI", "ml", "mcg", "g"])
    with col2:
        frecuencia = st.selectbox("Frecuencia", [
            "Una vez al día", "Dos veces al día",
            "Tres veces al día", "Con cada comida",
            "Cada 8 horas", "Cada 12 horas"
        ])
        fecha_inicio = st.date_input("Fecha de inicio", value=datetime.today())
        fecha_fin = st.date_input("Fecha de fin (opcional)", value=None)

    if st.button("💾 Guardar prescripción", use_container_width=True):
        try:
            data = {
                "id_paciente": pid,
                "nombre": nombre_med,
                "dosis": dosis,
                "unidad": unidad,
                "frecuencia": frecuencia,
                "fecha_inicio": str(fecha_inicio),
                "fecha_fin": str(fecha_fin) if fecha_fin else None,
                "estado": "activo"
            }
            sb.table("medicamentos").insert(data).execute()
            st.success(f"✅ Prescripción de {nombre_med} guardada para {pac_sel}.")
        except Exception as e:
            st.error(f"Error: {e}")

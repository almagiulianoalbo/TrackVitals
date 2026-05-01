import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from config import get_supabase
from datetime import datetime

# Colores TrackVitals
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
            <div style='background:{VERDE_CLARO}; border-radius:12px; padding:12px; margin-bottom:20px;'>
                <div style='font-weight:600; color:{VERDE};'>👤 {u["nombre"]} {u["apellido"]}</div>
                <div style='font-size:0.8rem; color:#555;'>{u.get("tipo_diabetes","")}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        paginas = {
            "📊 Panel principal": "dashboard",
            "📝 Registro diario": "registro",
            "🍽️ Mi dieta": "dieta",
            "📋 Historia clínica": "historia",
            "💊 Medicamentos": "medicamentos",
            "🔔 Alertas": "alertas",
            "📅 Mis turnos": "turnos",
        }
        for label, key in paginas.items():
            if st.button(label, key=f"nav_{key}", use_container_width=True):
                st.session_state.pagina = key
                st.rerun()

        st.markdown("---")
        if st.button("🚪 Cerrar sesión", use_container_width=True):
            st.session_state.logged_in = False
            st.session_state.usuario = None
            st.session_state.rol = None
            st.rerun()

    # ── Contenido según página ────────────────────────────────────────────────
    pagina = st.session_state.get("pagina", "dashboard")

    if pagina == "dashboard":
        _panel_principal(u, sb)
    elif pagina == "registro":
        _registro_diario(u, sb)
    elif pagina == "dieta":
        _dieta(u, sb)
    elif pagina == "historia":
        _historia_clinica(u, sb)
    elif pagina == "medicamentos":
        _medicamentos(u, sb)
    elif pagina == "alertas":
        _alertas(u, sb)
    elif pagina == "turnos":
        _turnos(u, sb)


# ── PANEL PRINCIPAL ───────────────────────────────────────────────────────────
def _panel_principal(u, sb):
    pid = u["id_paciente"]

    st.markdown(f"<h2 style='color:{AZUL}; margin-bottom:4px;'>Buen día, {u['nombre']} 👋</h2>", unsafe_allow_html=True)
    st.markdown(f"<p style='color:#888; margin-bottom:24px;'>{datetime.now().strftime('%A %d de %B, %Y')}</p>", unsafe_allow_html=True)

    # Último registro
    reg = sb.table("registros_diarios").select("*").eq("id_paciente", pid).order("fecha_hora", desc=True).limit(1).execute()
    ultimo = reg.data[0] if reg.data else None

    # Todos los registros del mes
    todos = sb.table("registros_diarios").select("*").eq("id_paciente", pid).order("fecha_hora").execute()
    df = pd.DataFrame(todos.data) if todos.data else pd.DataFrame()

    # ── Métricas ──────────────────────────────────────────────────────────────
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        val = ultimo["glucemia_mgdl"] if ultimo else "—"
        color = VERDE if isinstance(val, int) and 70 <= val <= 180 else ROJO if isinstance(val, int) else AZUL
        badge = "Normal" if isinstance(val, int) and 70 <= val <= 180 else ("Alta" if isinstance(val, int) and val > 180 else ("Baja" if isinstance(val, int) else ""))
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Última glucemia</div>
            <div class='metric-value' style='color:{color};'>{val} <span style='font-size:1rem;'>mg/dL</span></div>
            <div class='metric-sub'>{badge}</div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        if not df.empty and "glucemia_mgdl" in df.columns:
            prom = round(df["glucemia_mgdl"].mean(), 1)
        else:
            prom = "—"
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Promedio glucemia</div>
            <div class='metric-value' style='color:{AZUL};'>{prom} <span style='font-size:1rem;'>mg/dL</span></div>
            <div class='metric-sub'>Últimos registros</div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        if ultimo:
            dosis = ultimo.get("dosis_unidades", 0) or 0
            tipo_ins = ultimo.get("tipo_insulina", "—") or "—"
        else:
            dosis, tipo_ins = "—", "—"
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Última insulina</div>
            <div class='metric-value' style='color:{VERDE};'>{dosis} <span style='font-size:1rem;'>UI</span></div>
            <div class='metric-sub'>{tipo_ins}</div>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        alertas = sb.table("alerta").select("*").eq("id_paciente", pid).eq("vista", False).execute()
        n_alertas = len(alertas.data) if alertas.data else 0
        color_a = ROJO if n_alertas > 0 else VERDE
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Alertas sin ver</div>
            <div class='metric-value' style='color:{color_a};'>{n_alertas}</div>
            <div class='metric-sub'>{'⚠️ Revisá alertas' if n_alertas > 0 else '✅ Todo en orden'}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='margin-top:28px;'></div>", unsafe_allow_html=True)

    # ── Gráfico glucemia ──────────────────────────────────────────────────────
    if not df.empty:
        st.markdown(f"<div class='section-header'>📈 Evolución de glucemia</div>", unsafe_allow_html=True)

        df["fecha_hora"] = pd.to_datetime(df["fecha_hora"])
        df_plot = df[df["glucemia_mgdl"] > 0].copy()

        fig = go.Figure()

        # Zona normal
        fig.add_hrect(y0=70, y1=180, fillcolor="rgba(46,125,50,0.07)",
                      line_width=0, annotation_text="Rango normal", annotation_position="top left")

        # Línea glucemia
        fig.add_trace(go.Scatter(
            x=df_plot["fecha_hora"],
            y=df_plot["glucemia_mgdl"],
            mode="lines+markers",
            name="Glucemia",
            line=dict(color=AZUL, width=2.5),
            marker=dict(size=5, color=AZUL),
            hovertemplate="<b>%{y} mg/dL</b><br>%{x}<extra></extra>"
        ))

        fig.update_layout(
            paper_bgcolor="white",
            plot_bgcolor="white",
            height=300,
            margin=dict(l=20, r=20, t=20, b=20),
            xaxis=dict(showgrid=False, tickfont=dict(size=11)),
            yaxis=dict(gridcolor="#f0f0f0", tickfont=dict(size=11), title="mg/dL"),
            showlegend=False,
            font=dict(family="DM Sans")
        )
        st.plotly_chart(fig, use_container_width=True)

        # ── Gráfico dosis insulina ────────────────────────────────────────────
        df_ins = df[df["dosis_unidades"] > 0].copy()
        if not df_ins.empty:
            st.markdown(f"<div class='section-header'>💉 Dosis de insulina</div>", unsafe_allow_html=True)
            fig2 = px.bar(
                df_ins, x="fecha_hora", y="dosis_unidades",
                color="tipo_insulina",
                color_discrete_sequence=[VERDE, AZUL, NARANJA],
                labels={"dosis_unidades": "Unidades (UI)", "fecha_hora": "Fecha", "tipo_insulina": "Tipo"},
                height=260
            )
            fig2.update_layout(
                paper_bgcolor="white", plot_bgcolor="white",
                margin=dict(l=20, r=20, t=20, b=20),
                font=dict(family="DM Sans"),
                legend=dict(orientation="h", yanchor="bottom", y=1.02)
            )
            st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("Todavía no hay registros diarios. ¡Empezá cargando tu primer registro!")


# ── REGISTRO DIARIO ───────────────────────────────────────────────────────────
def _registro_diario(u, sb):
    pid = u["id_paciente"]
    st.markdown(f"<div class='section-header'>📝 Nuevo registro diario</div>", unsafe_allow_html=True)

    col1, col2 = st.columns(2)
    with col1:
        momento = st.selectbox("Momento del día", [
            "Antes desayuno", "Después desayuno",
            "Antes almuerzo", "Después almuerzo",
            "Antes merienda", "Después merienda",
            "Antes cena", "Después cena",
            "Antes de dormir"
        ])
        glucemia = st.number_input("Glucemia (mg/dL)", min_value=20, max_value=600, value=120)
        carbohidratos = st.number_input("Carbohidratos ingeridos (g)", min_value=0, max_value=500, value=0)

    with col2:
        tipo_insulina = st.selectbox("Tipo de insulina", ["Ninguna", "NPH", "Glargina", "Detemir", "Lispro", "Aspart"])
        dosis = st.number_input("Dosis (UI)", min_value=0.0, max_value=100.0, value=0.0, step=0.5)
        fecha_hora = st.datetime_input("Fecha y hora", value=datetime.now()) if hasattr(st, 'datetime_input') else datetime.now()

    observaciones = st.text_area("Observaciones (opcional)", placeholder="Ej: comí más de lo habitual, me sentí mareado...")

    # Alerta automática
    alerta_msg = None
    if glucemia < 70:
        alerta_msg = ("baja", f"⚠️ Glucemia baja detectada: {glucemia} mg/dL. Valores normales: 70-180 mg/dL.")
    elif glucemia > 250:
        alerta_msg = ("alta", f"⚠️ Glucemia muy alta detectada: {glucemia} mg/dL. Consultá a tu médico.")

    if alerta_msg:
        clase = "alerta-baja" if alerta_msg[0] == "baja" else "alerta-alta"
        st.markdown(f"<div class='{clase}'>{alerta_msg[1]}</div>", unsafe_allow_html=True)

    if st.button("💾 Guardar registro", use_container_width=True):
        try:
            data = {
                "id_paciente": pid,
                "fecha_hora": datetime.now().isoformat(),
                "momento": momento,
                "glucemia_mgdl": glucemia,
                "carbohidratos_g": carbohidratos,
                "tipo_insulina": None if tipo_insulina == "Ninguna" else tipo_insulina,
                "dosis_unidades": dosis if dosis > 0 else None
            }
            sb.table("registros_diarios").insert(data).execute()

            # Guardar alerta si corresponde
            if alerta_msg:
                sb.table("alerta").insert({
                    "id_paciente": pid,
                    "tipo": f"glucemia_{alerta_msg[0]}",
                    "valor_disparador": glucemia,
                    "fecha": datetime.now().isoformat(),
                    "vista": False
                }).execute()

            st.success("✅ Registro guardado correctamente.")
        except Exception as e:
            st.error(f"Error al guardar: {e}")

    # Últimos registros
    st.markdown("<div style='margin-top:28px;'></div>", unsafe_allow_html=True)
    st.markdown(f"<div class='section-header'>🕐 Últimos registros</div>", unsafe_allow_html=True)
    res = sb.table("registros_diarios").select("*").eq("id_paciente", pid).order("fecha_hora", desc=True).limit(14).execute()
    if res.data:
        df = pd.DataFrame(res.data)[["fecha_hora", "momento", "glucemia_mgdl", "carbohidratos_g", "tipo_insulina", "dosis_unidades"]]
        df.columns = ["Fecha/hora", "Momento", "Glucemia (mg/dL)", "Carbohidratos (g)", "Insulina", "Dosis (UI)"]
        st.dataframe(df, use_container_width=True, hide_index=True)


# ── DIETA ─────────────────────────────────────────────────────────────────────
def _dieta(u, sb):
    pid = u["id_paciente"]
    st.markdown(f"<div class='section-header'>🍽️ Mi plan de dieta</div>", unsafe_allow_html=True)

    res = sb.table("dietas").select("*").eq("id_paciente", pid).eq("estado", "activo").limit(1).execute()
    if not res.data:
        st.info("No tenés una dieta asignada aún. Tu médico te la asignará en la próxima consulta.")
        return

    dieta = res.data[0]
    id_dieta = dieta["id_dieta"]

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Objetivo calórico</div>
            <div class='metric-value' style='color:{VERDE};'>{dieta['objetivo_calorico']}</div>
            <div class='metric-sub'>kcal / día</div>
        </div>""", unsafe_allow_html=True)
    with col2:
        desde = dieta.get("fecha_asignacion", "—")
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Asignada el</div>
            <div class='metric-value' style='color:{AZUL}; font-size:1.4rem;'>{desde}</div>
            <div class='metric-sub'>Estado: {dieta.get('estado','')}</div>
        </div>""", unsafe_allow_html=True)
    with col3:
        obs = dieta.get("observaciones","") or ""
        st.markdown(f"""
        <div class='metric-card'>
            <div class='metric-label'>Observaciones</div>
            <div class='metric-sub' style='margin-top:8px;'>{obs}</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("<div style='margin-top:20px;'></div>", unsafe_allow_html=True)

    # Comidas del día
    comidas = sb.table("comidas").select("*").eq("id_dieta", id_dieta).execute()
    if comidas.data:
        df_c = pd.DataFrame(comidas.data)
        momentos = ["Desayuno", "Almuerzo", "Merienda", "Cena"]
        tabs = st.tabs([m for m in momentos if m in df_c["momento"].values])

        for tab, momento in zip(tabs, [m for m in momentos if m in df_c["momento"].values]):
            with tab:
                fila = df_c[df_c["momento"] == momento].iloc[0]
                col_a, col_b = st.columns([2, 1])
                with col_a:
                    st.markdown(f"**🥗 {fila['descripcion']}**")
                with col_b:
                    st.markdown(f"""
                    <div style='background:{VERDE_CLARO}; padding:10px; border-radius:10px; text-align:center;'>
                        <div style='font-weight:700; color:{VERDE};'>{fila['calorias']} kcal</div>
                        <div style='font-size:0.8rem; color:#555;'>{fila['carbohidratos']}g carbohidratos</div>
                    </div>""", unsafe_allow_html=True)

        # Resumen gráfico
        st.markdown("<div style='margin-top:20px;'></div>", unsafe_allow_html=True)
        total_cal = df_c["calorias"].sum()
        total_carbs = df_c["carbohidratos"].sum()

        fig = px.pie(df_c, values="calorias", names="momento",
                     color_discrete_sequence=[AZUL, VERDE, NARANJA, "#7b1fa2"],
                     title=f"Distribución calórica — Total: {total_cal} kcal")
        fig.update_layout(font=dict(family="DM Sans"), paper_bgcolor="white", height=300)
        st.plotly_chart(fig, use_container_width=True)


# ── HISTORIA CLÍNICA ──────────────────────────────────────────────────────────
def _historia_clinica(u, sb):
    pid = u["id_paciente"]
    st.markdown(f"<div class='section-header'>📋 Historia clínica</div>", unsafe_allow_html=True)

    res = sb.table("historia_clinica").select("*").eq("id_paciente", pid).execute()
    if not res.data:
        st.info("No hay datos en tu historia clínica aún.")
        return

    h = res.data[0]
    peso = h.get("peso", 0)
    altura = h.get("altura", 0)
    imc = round(peso / ((altura/100)**2), 1) if peso and altura else None

    col1, col2, col3, col4 = st.columns(4)
    datos = [
        ("Peso", f"{peso} kg", AZUL),
        ("Altura", f"{altura} cm", VERDE),
        ("IMC", str(imc) if imc else "—", NARANJA),
        ("Tipo diabetes", h.get("tipo_diabetes","—"), AZUL),
    ]
    for col, (label, val, color) in zip([col1,col2,col3,col4], datos):
        with col:
            st.markdown(f"""
            <div class='metric-card'>
                <div class='metric-label'>{label}</div>
                <div class='metric-value' style='color:{color}; font-size:1.6rem;'>{val}</div>
            </div>""", unsafe_allow_html=True)

    # Médico cabecera
    st.markdown("<div style='margin-top:20px;'></div>", unsafe_allow_html=True)
    id_med = u.get("id_medico_cabecera")
    if id_med:
        med = sb.table("medicos").select("*").eq("id_medico", id_med).execute()
        if med.data:
            m = med.data[0]
            st.markdown(f"""
            <div class='metric-card' style='max-width:400px;'>
                <div class='metric-label'>Médico cabecera</div>
                <div style='font-size:1.1rem; font-weight:600; color:{AZUL}; margin-top:6px;'>
                    Dr/a. {m['nombre']} {m['apellido']}
                </div>
                <div style='font-size:0.85rem; color:#666; margin-top:4px;'>
                    📋 Mat. {m.get('matricula','')} &nbsp;·&nbsp; 📧 {m.get('email','')}
                </div>
            </div>""", unsafe_allow_html=True)


# ── MEDICAMENTOS ──────────────────────────────────────────────────────────────
def _medicamentos(u, sb):
    pid = u["id_paciente"]
    st.markdown(f"<div class='section-header'>💊 Mis medicamentos</div>", unsafe_allow_html=True)

    res = sb.table("medicamentos").select("*").eq("id_paciente", pid).execute()
    if not res.data:
        st.info("No tenés medicamentos registrados.")
        return

    for m in res.data:
        estado = m.get("estado","")
        badge_class = "badge-ok" if estado == "activo" else "badge-warn"
        st.markdown(f"""
        <div class='metric-card' style='margin-bottom:12px;'>
            <div style='display:flex; justify-content:space-between; align-items:center;'>
                <div style='font-size:1.1rem; font-weight:600; color:{AZUL};'>💊 {m['nombre']}</div>
                <span class='badge {badge_class}'>{estado}</span>
            </div>
            <div style='margin-top:8px; color:#555; font-size:0.9rem;'>
                <b>Dosis:</b> {m['dosis']} {m.get('unidad','')} &nbsp;·&nbsp;
                <b>Frecuencia:</b> {m.get('frecuencia','')} &nbsp;·&nbsp;
                <b>Desde:</b> {m.get('fecha_inicio','')}
            </div>
        </div>
        """, unsafe_allow_html=True)


# ── ALERTAS ───────────────────────────────────────────────────────────────────
def _alertas(u, sb):
    pid = u["id_paciente"]
    st.markdown(f"<div class='section-header'>🔔 Mis alertas</div>", unsafe_allow_html=True)

    res = sb.table("alerta").select("*").eq("id_paciente", pid).order("fecha", desc=True).execute()
    if not res.data:
        st.success("✅ No tenés alertas registradas.")
        return

    for a in res.data:
        tipo = a.get("tipo","")
        vista = a.get("vista", False)
        clase = "alerta-baja" if "baja" in tipo else "alerta-alta"
        emoji = "🔴" if "baja" in tipo else "🟠"
        icon_vista = "✅" if vista else "🔔"
        st.markdown(f"""
        <div class='{clase}'>
            {emoji} <b>{tipo.replace("_"," ").title()}</b> — Valor: {a.get('valor_disparador','')} mg/dL
            <span style='float:right; font-size:0.8rem;'>{icon_vista} {a.get('fecha','')[:16]}</span>
        </div>
        """, unsafe_allow_html=True)


# ── TURNOS ────────────────────────────────────────────────────────────────────
def _turnos(u, sb):
    pid = u["id_paciente"]
    st.markdown(f"<div class='section-header'>📅 Mis turnos</div>", unsafe_allow_html=True)

    res = sb.table("turnos").select("*, medicos(nombre, apellido)").eq("id_paciente", pid).order("fecha_hora", desc=True).execute()

    if not res.data:
        st.info("No tenés turnos registrados.")
    else:
        for t in res.data:
            med_info = t.get("medicos") or {}
            estado = t.get("estado","")
            colores = {"confirmado": "badge-ok", "pendiente": "badge-warn", "cancelado": "badge-danger", "realizado": "badge-ok"}
            badge_c = colores.get(estado, "badge-warn")
            st.markdown(f"""
            <div class='metric-card' style='margin-bottom:10px;'>
                <div style='display:flex; justify-content:space-between;'>
                    <div>
                        <div style='font-weight:600; color:{AZUL};'>📅 {t.get('fecha_hora','')[:16]}</div>
                        <div style='color:#555; font-size:0.9rem; margin-top:4px;'>
                            Dr/a. {med_info.get('nombre','')} {med_info.get('apellido','')}
                        </div>
                        <div style='color:#777; font-size:0.85rem;'>📝 {t.get('motivo','')}</div>
                    </div>
                    <span class='badge {badge_c}' style='height:fit-content;'>{estado}</span>
                </div>
            </div>""", unsafe_allow_html=True)

    # Pedir turno
    st.markdown("<div style='margin-top:24px;'></div>", unsafe_allow_html=True)
    st.markdown(f"<div class='section-header'>➕ Pedir nuevo turno</div>", unsafe_allow_html=True)

    medicos = sb.table("medicos").select("id_medico, nombre, apellido").execute()
    if medicos.data:
        opciones = {f"Dr/a. {m['nombre']} {m['apellido']}": m["id_medico"] for m in medicos.data}
        med_sel = st.selectbox("Médico", list(opciones.keys()))
        motivo = st.text_input("Motivo de la consulta")
        fecha = st.date_input("Fecha preferida")
        hora = st.time_input("Hora preferida")

        if st.button("📅 Solicitar turno", use_container_width=True):
            try:
                sb.table("turnos").insert({
                    "id_paciente": pid,
                    "id_medico": opciones[med_sel],
                    "fecha_hora": f"{fecha}T{hora}",
                    "motivo": motivo,
                    "estado": "pendiente"
                }).execute()
                st.success("✅ Turno solicitado. El médico lo confirmará a la brevedad.")
                st.rerun()
            except Exception as e:
                st.error(f"Error: {e}")

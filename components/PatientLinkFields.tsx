export function PatientLinkFields() {
  return (
    <>
      <p className="form-helper">Buscá un paciente ya registrado. Podés completar uno o varios datos; si cargás varios, tienen que coincidir.</p>
      <div className="field-grid">
        <label className="field">
          <span>ID paciente</span>
          <input name="id_paciente" type="number" min="1" step="1" placeholder="Ej. 12" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" placeholder="paciente@email.com" />
        </label>
        <label className="field">
          <span>DNI</span>
          <input name="dni" type="text" inputMode="numeric" placeholder="DNI del paciente" />
        </label>
      </div>
    </>
  );
}

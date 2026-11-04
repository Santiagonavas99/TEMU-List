import React, { useEffect, useState } from "react";

const SESSION = "temu-family-v2-session";
const REMEMBER = "temu-family-v2-remember";
const blankWish = () => ({ title: "", url: "", notes: "", price: null });
const normalize = value => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const countWishes = person => (person.wishes || []).filter(w => !!w.url).length;
const isComplete = person => !!person.name?.trim() && countWishes(person) >= 3;

async function request(body) {
  const response = await fetch("/api/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "No se pudo conectar. Intenta de nuevo.");
  return result;
}

async function copy(text, notify) {
  try {
    await navigator.clipboard.writeText(text);
    notify("Copiado al portapapeles.");
  } catch {
    notify("No se pudo copiar automáticamente. Selecciona el texto manualmente.");
  }
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => chars[byte & 31]).join("").match(/.{1,5}/g).join("-");
}

function Modal({ children, title, close }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div className="modal-overlay" onMouseDown={event => event.target === event.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="dialog">
        <div className="dialog-head">
          <div><p className="eyebrow">TEMU EDITION · FAMILIAS</p><h2>{title}</h2></div>
          <button type="button" className="icon-button" onClick={close} aria-label="Cerrar ventana">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [family, setFamily] = useState(null);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("login");
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState("");
  const [notice, setNotice] = useState("");
  const [remember, setRemember] = useState(!!localStorage.getItem(REMEMBER));
  const [groupName, setGroupName] = useState("");
  const [groupSize, setGroupSize] = useState(8);
  const [loginCode, setLoginCode] = useState("");
  const [editPerson, setEditPerson] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [initialCode, setInitialCode] = useState("");

  function storeCode(value, saveOnDevice) {
    sessionStorage.setItem(SESSION, value);
    if (saveOnDevice) localStorage.setItem(REMEMBER, value);
    else localStorage.removeItem(REMEMBER);
    setCode(value);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION) || localStorage.getItem(REMEMBER);
    if (!saved) return;
    setPending(true);
    request({ action: "login", code: saved })
      .then(data => { setFamily(data.family); setCode(saved); })
      .catch(() => { sessionStorage.removeItem(SESSION); localStorage.removeItem(REMEMBER); })
      .finally(() => setPending(false));
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setPending(true);
    setAlert("");
    try {
      const data = await request({ action: "login", code: loginCode.trim() });
      storeCode(loginCode.trim(), remember);
      setFamily(data.family);
    } catch (error) { setAlert(error.message); }
    finally { setPending(false); }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setPending(true);
    setAlert("");
    try {
      const data = await request({ action: "create", family_name: groupName.trim(), participants: Number(groupSize) });
      storeCode(data.master_code, remember);
      setInitialCode(data.master_code);
      setFamily(data.family);
    } catch (error) { setAlert(error.message); }
    finally { setPending(false); }
  }

  function logOut() {
    sessionStorage.removeItem(SESSION);
    localStorage.removeItem(REMEMBER);
    setFamily(null);
    setCode("");
    setLoginCode("");
    setMode("login");
    setInitialCode("");
    setAlert("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setPending(true);
    setAlert("");
    try {
      const data = await request({
        action: "save", code, person_id: editPerson.id,
        name: editPerson.name.trim(), wishes: editPerson.wishes
      });
      setFamily(data.family);
      setEditPerson(null);
      setNotice("Lista actualizada correctamente.");
    } catch (error) { setAlert(error.message); }
    finally { setPending(false); }
  }

  async function handleRename(event) {
    event.preventDefault();
    setPending(true);
    setAlert("");
    try {
      const data = await request({ action: "rename", code, family_name: groupName.trim() });
      setFamily(data.family);
      setRenameOpen(false);
      setNotice("Nombre actualizado.");
    } catch (error) { setAlert(error.message); }
    finally { setPending(false); }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setAlert("");
    const clean = normalize(newPassword);
    if (normalize(currentPassword) !== normalize(code)) return setAlert("La contraseña actual no coincide.");
    if (!/^[A-Za-z0-9 -]+$/.test(newPassword) || clean.length < 12 || clean.length > 32 || !/[A-Z]/.test(clean) || !/[0-9]/.test(clean))
      return setAlert("Usa de 12 a 32 caracteres, con letras y números; puedes separar con guiones.");
    if (clean === normalize(code)) return setAlert("La contraseña nueva debe ser diferente.");
    if (clean !== normalize(confirmPassword)) return setAlert("La confirmación no coincide.");
    setPending(true);
    try {
      const data = await request({ action: "change_password", code: currentPassword, new_code: newPassword });
      if (!data.changed) throw new Error("No se confirmó el cambio.");
      storeCode(newPassword, !!localStorage.getItem(REMEMBER));
      setFamily(data.family);
      setPasswordChanged(true);
      setNotice("La contraseña anterior dejó de funcionar.");
    } catch (error) { setAlert(error.message); }
    finally { setPending(false); }
  }

  function startEdit(person) {
    setAlert("");
    setEditPerson({
      id: person.id,
      name: person.name || "",
      wishes: (person.wishes || []).map(w => ({ ...blankWish(), ...w }))
    });
  }

  function changeWish(index, field, value) {
    setEditPerson(previous => ({
      ...previous,
      wishes: previous.wishes.map((wish, i) => i === index ? { ...wish, [field]: value } : wish)
    }));
  }

  function addWish() {
    setEditPerson(previous => ({
      ...previous,
      wishes: [...previous.wishes, blankWish()]
    }));
  }

  function removeWish(index) {
    setEditPerson(previous => ({
      ...previous,
      wishes: previous.wishes.filter((_, i) => i !== index)
    }));
  }

  const inviteText = family
    ? "¡Hola, familia! 🎁\n\nAquí podemos escribir nuestros deseos de Temu:\nhttps://amigo-secreto-temu-familia.vercel.app\n\nFamilia: " + family.name + "\nContraseña maestra: " + code + "\n\nGuarden la contraseña para entrar a las listas."
    : "";
  const filled = family?.people.reduce((sum, p) => sum + countWishes(p), 0) || 0;
  const baseFilled = family?.people.reduce((sum, p) => sum + Math.min(3, countWishes(p)), 0) || 0;
  const completed = family?.people.filter(isComplete).length || 0;
  const total = family?.people.length || 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="brand-symbol">♧</span><div><strong>Amigo Secreto</strong><small>TEMU EDITION · FAMILIAS</small></div></div>
        {family && <button className="button soft" onClick={logOut}>Salir de la familia</button>}
      </header>

      {!family ? (
        <main className="auth-layout">
          <section className="auth-card">
            <div className="gift-icon">♡</div>
            <p className="eyebrow">NUESTRA LISTA DE DESEOS</p>
            <h1>{mode === "login" ? "Entra a tu familia" : "Crea una familia"}</h1>
            <p className="muted">{mode === "login" ? "Introduce la contraseña maestra de tu familia para ver sus listas." : "Cada familia tendrá sus propias listas y su contraseña."}</p>
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "selected" : ""} onClick={() => {setMode("login");setAlert("");}}>Tengo una familia</button>
              <button role="tab" aria-selected={mode === "create"} className={mode === "create" ? "selected" : ""} onClick={() => {setMode("create");setAlert("");}}>Crear familia</button>
            </div>
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="form">
                <label>Contraseña maestra<input type="password" required value={loginCode} onChange={event => setLoginCode(event.target.value)} placeholder="Escribe la contraseña" autoComplete="off" /></label>
                <label className="check"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Recordar en este dispositivo</label>
                {alert && <p className="error" role="alert">{alert}</p>}
                <button className="button primary full" disabled={pending}>Entrar a mi familia →</button>
              </form>
            ) : (
              <form onSubmit={handleCreate} className="form">
                <label>Nombre de la familia<input required minLength={3} maxLength={70} value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="Por ejemplo: Familia Ramírez" /></label>
                <label>¿Cuántas personas participan?<input type="number" required min={2} max={20} value={groupSize} onChange={event => setGroupSize(event.target.value)} /></label>
                <label className="check"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Recordar la familia en este dispositivo</label>
                {alert && <p className="error" role="alert">{alert}</p>}
                <button className="button primary full" disabled={pending}>Crear nuestra lista →</button>
              </form>
            )}
          </section>
        </main>
      ) : (
        <main className="workspace">
          <section className="hero">
            <span className="hero-pill">♡ SOLO LOS DE NUESTRA FAMILIA</span>
            <h1>La lista de <em>{family.name}.</em></h1>
            <p>Una familia, sus propios deseos. Añade al menos tres enlaces de Temu por persona y vuelve cuando quieras a verlos.</p>
            <div className="hero-actions">
              <a href="#deseos" className="button white">Ver nuestros deseos →</a>
              <button className="button translucent" onClick={() => copy(inviteText, setNotice)}>Invitar a la familia</button>
            </div>
            <div className="hero-graphic" aria-hidden="true">🎁</div>
          </section>

          {initialCode && (
            <section className="secret-info">
              <div><strong>Tu contraseña maestra</strong><p>Guárdala y compártela con los integrantes. No se puede recuperar automáticamente.</p><code>{initialCode}</code></div>
              <button className="button outline" onClick={() => copy(initialCode, setNotice)}>Copiar contraseña</button>
              <button className="icon-button" onClick={() => setInitialCode("")} aria-label="Ocultar contraseña">×</button>
            </section>
          )}

          <div className="overview">
            <div className="stat"><span>Personas</span><strong>{total}</strong><small>En esta familia</small></div>
            <div className="stat"><span>Listas completas</span><strong>{completed} / {total}</strong><small>Al menos 3 enlaces</small></div>
            <div className="stat"><span>Deseos agregados</span><strong>{filled}</strong><small>Sin límite de tres</small></div>
          </div>
          <div className="progress"><div style={{ width: (total ? baseFilled / (total * 3) * 100 : 0) + "%" }} /></div>
          <div className="section-title" id="deseos"><div><p className="eyebrow">NUESTROS DESEOS</p><h2>Las listas de nuestra familia</h2></div><span>{completed} listas completas</span></div>

          <div className="cards">
            {family.people.map((person, i) => (
              <article className="person-card" key={person.id}>
                <div className="person-head">
                  <span className="avatar">{person.name ? person.name[0].toUpperCase() : String(i + 1)}</span>
                  <div className="person-name"><small>PERSONA {String(i + 1).padStart(2, "0")}</small><h3>{person.name || "Sin nombre"}</h3></div>
                  <span className={isComplete(person) ? "status complete" : "status"}>{isComplete(person) ? "✓ Completa" : "Pendiente"}</span>
                </div>
                <div className="wish-head"><span>SUS DESEOS DE TEMU</span><span>{countWishes(person)} deseos ♡</span></div>
                <div className="wish-list">
                  {(person.wishes || []).filter(w => w.url).map((wish, wi) => (
                    <a href={wish.url} target="_blank" rel="noopener noreferrer" className="wish" key={wi}>
                      <span className="wish-check">✓</span>
                      <span className="wish-name"><strong>{wish.title || "Regalo de Temu"}</strong><small>{wish.notes || "Enlace de Temu añadido"}</small></span>
                      <span className="wish-view">Ver ↗</span>
                    </a>
                  ))}
                  {!countWishes(person) && <div className="empty-list">Aún no hay deseos. ¡Añade los primeros!</div>}
                </div>
                <div className="card-bottom"><span>{isComplete(person) ? "● Lista terminada" : "○ Faltan deseos"}</span><button className="button edit" onClick={() => startEdit(person)}>✎ Editar lista</button></div>
              </article>
            ))}
          </div>
          <div className="workspace-footer">
            <button className="text-button" onClick={() => { setGroupName(family.name); setAlert(""); setRenameOpen(true); }}>Cambiar nombre</button>
            <span>·</span>
            <button className="text-button" onClick={() => { setCurrentPassword(code);setNewPassword("");setConfirmPassword("");setPasswordChanged(false);setAlert("");setPasswordOpen(true); }}>Cambiar contraseña maestra</button>
            <span>·</span>
            <button className="text-button" onClick={logOut}>Salir de la familia</button>
          </div>
        </main>
      )}
      {notice && <div className="toast" role="status" onClick={() => setNotice("")}>{notice} ×</div>}

      {editPerson && <Modal title={"Deseos de " + (editPerson.name || "una persona")} close={() => setEditPerson(null)}>
        <form className="form" onSubmit={handleSave}>
          <label>Nombre<input value={editPerson.name} maxLength={48} onChange={e => setEditPerson(p => ({...p,name:e.target.value}))} placeholder="Nombre del integrante" required /></label>
          <p className="small-note">Comienza con tres deseos; puedes añadir hasta veinte opciones.</p>
          {editPerson.wishes.map((wish, index) => <div className="wish-editor" key={index}>
            <div className="editor-heading"><strong>Deseo {String(index + 1).padStart(2, "0")}</strong>{index >= 3 && <button type="button" className="text-button remove" onClick={() => removeWish(index)}>× Quitar</button>}</div>
            <label>Enlace de Temu<input type="url" value={wish.url} onChange={e => changeWish(index, "url", e.target.value)} placeholder="https://www.temu.com/..." /></label>
            <label>Nombre del regalo<input value={wish.title} maxLength={120} onChange={e => changeWish(index, "title", e.target.value)} placeholder="Nombre o descripción corta" /></label>
            <label>Notas opcionales<input value={wish.notes} maxLength={160} onChange={e => changeWish(index, "notes", e.target.value)} placeholder="Color, talla, modelo..." /></label>
          </div>)}
          {editPerson.wishes.length < 20 && <button className="button add-option full" onClick={addWish} type="button">+ Añadir otra opción</button>}
          {alert && <p className="error" role="alert">{alert}</p>}
          <div className="modal-actions"><button type="button" onClick={() => setEditPerson(null)} className="button outline">Cancelar</button><button className="button primary" disabled={pending}>Guardar deseos</button></div>
        </form>
      </Modal>}

      {renameOpen && <Modal title="Cambiar nombre de la familia" close={() => setRenameOpen(false)}>
        <form className="form" onSubmit={handleRename}>
          <label>Nombre de la familia<input value={groupName} minLength={3} maxLength={70} onChange={event => setGroupName(event.target.value)} required /></label>
          {alert && <p className="error" role="alert">{alert}</p>}
          <div className="modal-actions"><button type="button" className="button outline" onClick={() => setRenameOpen(false)}>Cancelar</button><button className="button primary" disabled={pending}>Guardar nombre</button></div>
        </form>
      </Modal>}

      {passwordOpen && <Modal title={passwordChanged ? "¡Contraseña actualizada!" : "Cambiar contraseña maestra"} close={() => setPasswordOpen(false)}>
        {passwordChanged ? <div className="form">
          <p className="muted">La contraseña anterior dejó de funcionar. Comparte la nueva con toda la familia.</p>
          <div className="generated-code"><span>NUEVA CONTRASEÑA</span><strong>{newPassword}</strong></div>
          <button className="button outline full" onClick={() => copy(newPassword, setNotice)}>Copiar contraseña</button>
          <button className="button primary full" onClick={() => copy(inviteText, setNotice)}>Copiar invitación</button>
          <button className="button soft full" onClick={() => setPasswordOpen(false)}>Continuar a mis listas →</button>
        </div> : <form className="form" onSubmit={handleChangePassword}>
          <p className="muted">Cualquier integrante con la contraseña actual puede cambiarla para todos.</p>
          <label>Contraseña actual<input type="password" autoComplete="off" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label>
          <label>Nueva contraseña<input value={newPassword} autoComplete="new-password" onChange={e => setNewPassword(e.target.value)} placeholder="12–32 caracteres, letras y números" required /></label>
          <button type="button" className="button add-option full" onClick={() => {const next=makeCode();setNewPassword(next);setConfirmPassword(next);}}>✦ Generar contraseña segura</button>
          <label>Confirmar nueva contraseña<input value={confirmPassword} autoComplete="new-password" onChange={e => setConfirmPassword(e.target.value)} required /></label>
          <p className="warning"><strong>Importante:</strong> la antigua contraseña dejará de funcionar inmediatamente.</p>
          {alert && <p className="error" role="alert">{alert}</p>}
          <div className="modal-actions"><button type="button" className="button outline" onClick={() => setPasswordOpen(false)}>Cancelar</button><button className="button primary" disabled={pending}>Guardar contraseña</button></div>
        </form>}
      </Modal>}
    </div>
  );
}

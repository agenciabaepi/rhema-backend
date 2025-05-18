import React, { useState } from "react";

function NotificationForm() {
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const agendamento = new Date().toISOString();
    try {
      const response = await fetch("http://localhost:3000/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: token, title, body, agendamento }),
      });
      const data = await response.json();
      if (data.sucesso) {
        setMessage("Notificação enviada com sucesso!");
      } else {
        setMessage("Falha ao enviar notificação.");
      }
    } catch (error) {
      setMessage("Erro ao enviar notificação.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Corpo da notificação"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      <button type="submit">Enviar Notificação</button>
      {message && <p>{message}</p>}
    </form>
  );
}

export default NotificationForm;
require('dotenv').config();
const admin = require("firebase-admin");

if (!process.env.FIREBASE_KEY) {
  console.error("❌ FIREBASE_KEY não definida. Configure a variável de ambiente corretamente no Railway.");
  process.exit(1); // Encerra a aplicação com erro
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} catch (e) {
  console.error("❌ Erro ao fazer parse do FIREBASE_KEY. Verifique se está no formato JSON correto.");
  console.error(e);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const { Expo } = require("expo-server-sdk");
const expo = new Expo();

async function agendarNotificacaoDevocional() {
  const { status } = await Notifications.requestPermissionsAsync();
  console.log('Permissão de notificação:', status);
  if (status !== 'granted') return;

  const agora = new Date();
  const horaDesejada = new Date();
  horaDesejada.setHours(8);
  horaDesejada.setMinutes(0);
  horaDesejada.setSeconds(0);
  horaDesejada.setMilliseconds(0);

  const segundosParaDisparo = Math.floor((horaDesejada - agora) / 1000);
  if (segundosParaDisparo <= 0) {
    console.log('⏭️ Já passou da hora de hoje. Não será agendada.');
    return;
  }

  const notificacoes = await Notifications.getAllScheduledNotificationsAsync();
  const existeNotificacaoDevocional = notificacoes.some(
    (n) => n.content.title === "⏰ Hora do devocional!"
  );

  if (existeNotificacaoDevocional) {
    console.log('🔁 Notificação já agendada, não será duplicada.');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Hora do devocional!",
      body: "Já leu o devocional de hoje?",
      sound: true,
    },
    trigger: {
      seconds: segundosParaDisparo,
    },
  });

  console.log('📅 Notificação agendada para hoje às 08:00');
}

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post("/send-notification", async (req, res) => {
  const { to, title, body, agendamento } = req.body;

  try {
    const dataAgendada = new Date(agendamento);
    const delay = dataAgendada.getTime() - Date.now();

    if (delay <= 0) {
      console.log("⏱️ Agendamento em tempo passado, enviando agora...");
      await enviarNotificacaoAgora(to, title, body);
    } else {
      console.log(`⏳ Notificação será enviada em ${delay / 1000} segundos`);
      setTimeout(() => {
        enviarNotificacaoAgora(to, title, body);
      }, delay);
    }

    // Salva no histórico do Firestore
    await db.collection("notificacoes").add({
      to,
      title,
      body,
      data: admin.firestore.Timestamp.fromDate(new Date(agendamento)),
    });

    res.json({ sucesso: true });
  } catch (error) {
    console.error("Erro ao agendar notificação:", error);
    res.status(500).json({ erro: "Falha ao agendar notificação" });
  }
});

// Rota de status do backend
app.get("/", (req, res) => {
  res.send("🚀 Backend RHEMA está online!");
});

// Rota para buscar histórico de notificações
app.get("/notificacoes", async (req, res) => {
  try {
    const snapshot = await db.collection("notificacoes").orderBy("data", "desc").get();
    const dados = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(dados);
  } catch (err) {
    console.error("Erro ao buscar notificações:", err);
    res.status(500).json({ erro: "Erro ao buscar notificações" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

async function enviarNotificacaoAgora(to, title, body) {
  const mensagem = {
    to,
    sound: "default",
    title,
    body,
  };

  if (!Expo.isExpoPushToken(to)) {
    console.error("Token inválido:", to);
    return;
  }

  try {
    await expo.sendPushNotificationsAsync([mensagem]);
    console.log("📤 Notificação enviada:", title);
  } catch (err) {
    console.error("Erro ao enviar push:", err);
  }
}
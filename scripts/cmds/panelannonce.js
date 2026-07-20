const Database = require("better-sqlite3"); // Assure-toi d'utiliser ton instance SQLite habituelle
const path = require("path");
const db = new Database(path.join(__dirname, "../database.sqlite")); // Ajuste le chemin de ta bdd si besoin

// Création de la table si elle n'existe pas
db.prepare(`
  CREATE TABLE IF NOT EXISTS active_threads (
    threadID TEXT PRIMARY KEY
  )
`).run();

const nix = {
  name: "panelannonce",
  version: "2.1",
  aliases: ["annonce", "annonces"],
  description: "Diffuse une annonce dans tous les groupes enregistrés",
  author: "Camille Uchiha",
  prefix: true,
  category: "Administration",
  type: "admin",
  cooldown: 5,
  guide: "{p}panelannonce <texte> ou {p}panelannonce urgent <texte>"
};

async function onStart({ bot, args, message, msg, usages }) {
  const activeMessage = message || msg;
  if (!activeMessage) return;

  const chatId = activeMessage.chat?.id || activeMessage.threadID;

  // Enregistrement automatique du groupe actuel dans SQLite dès qu'une commande y est tapée
  if (chatId) {
    try {
      db.prepare("INSERT OR IGNORE INTO active_threads (threadID) VALUES (?)").run(String(chatId));
    } catch (e) {
      console.error("Erreur d'enregistrement SQLite :", e);
    }
  }

  const replyMethod = async (text) => {
    if (typeof activeMessage.reply === "function") {
      return activeMessage.reply(text);
    }
    if (chatId && typeof bot?.sendMessage === "function") {
      return bot.sendMessage(chatId, text);
    }
  };

  if (!args || args.length === 0) {
    const panelText = 
      "╔════════════════════╗\n" +
      "    📢 **PANEL ANNONCE GLOBAL**    \n" +
      "╚════════════════════╝\n\n" +
      "• Pour diffuser une annonce dans **tous** les groupes enregistrés :\n" +
      "  `!panelannonce [votre texte]`\n\n" +
      "• Pour diffuser une annonce urgente globale :\n" +
      "  `!panelannonce urgent [texte]`";

    return replyMethod(panelText);
  }

  const subCommand = args[0].toLowerCase();
  let textToSend = "";
  let isUrgent = false;

  if (subCommand === "urgent") {
    textToSend = args.slice(1).join(" ");
    isUrgent = true;
  } else {
    textToSend = args.join(" ");
  }

  if (!textToSend) {
    return replyMethod("❌ Veuillez saisir le texte à diffuser.");
  }

  const formattedMessage = isUrgent
    ? "🚨 ══════════════════ 🚨\n" +
      "         **ANNONCE URGENTE**\n" +
      "🚨 ══════════════════ 🚨\n\n" +
      textToSend + "\n\n" +
      "⚠️ *Veuillez prendre note de cette information importante.*"
    : "📢 ══════════════════ 📢\n" +
      "          **ANNONCE**\n" +
      "📢 ══════════════════ 📢\n\n" +
      textToSend + "\n\n" +
      "📌 *Diffusé par la modération.*";

  await replyMethod("⏳ Diffusion de l'annonce en cours...");

  // Récupération de tous les groupes stockés dans SQLite
  const rows = db.prepare("SELECT threadID FROM active_threads").all();

  if (!rows || rows.length === 0) {
    return replyMethod("❌ Aucun groupe enregistré pour le moment. Exécutez une commande dans vos groupes pour les enregistrer.");
  }

  let successCount = 0;
  let failCount = 0;

  for (const row of rows) {
    try {
      await bot.sendMessage(row.threadID, formattedMessage);
      successCount++;
    } catch (err) {
      failCount++;
    }
  }

  return replyMethod(`✅ Diffusion terminée !\n• Succès : ${successCount}\n• Échecs : ${failCount}`);
}

module.exports = { nix, onStart };

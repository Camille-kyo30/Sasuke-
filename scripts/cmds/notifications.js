const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const configPath = path.join(__dirname, "..", "..", "config.json");

function loadConfig() {
    try {
        const configData = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(configData);
    } catch (e) { return { admin: ["8984714130"] }; }
}

const nix = {
  name: "notification",
  version: "2.0.3-DEBUG", // Version avec diagnostic
  aliases: ["notify", "noti"],
  description: "Broadcast avec diagnostic de base de données",
  author: "Camille 🤍",
  type: "admin",
  cooldown: 5,
  guide: "{pn} <message>"
};

if (!global.telegramNotificationMemory) global.telegramNotificationMemory = new Map();

async function onStart({ bot, args, message, msg, chatId, userId }) {
  const currentMsg = message || msg;
  const senderID = String(userId || currentMsg?.from?.id || "").trim();
  const config = loadConfig();
  
  if (!config.admin.includes(senderID) && senderID !== "8984714130") {
    return bot.sendMessage(chatId, "⚠️ Accès refusé.");
  }

  const textMessage = args.join(" ").trim();
  if (!textMessage) return bot.sendMessage(chatId, "❌ Message vide.");

  // --- DIAGNOSTIC ---
  let allThreadID = [];
  console.log("[DEBUG NOTI] Tentative de récupération des threads...");

  if (global.threadsData && typeof global.threadsData.getAll === "function") {
    const list = await global.threadsData.getAll();
    console.log("[DEBUG NOTI] Contenu de threadsData :", JSON.stringify(list, null, 2));
    
    if (list && Array.isArray(list)) {
      allThreadID = list.map(t => ({
        threadID: String(t.threadID || t.tid || t.id),
        name: t.threadName || t.name || "Groupe Inconnu"
      }));
    }
  } else {
    console.log("[DEBUG NOTI] threadsData non trouvé ou getAll manquant !");
  }

  if (allThreadID.length === 0) {
    return bot.sendMessage(chatId, "❌ [DEBUG] Aucun groupe trouvé dans la base de données. Vérifie ta console serveur.");
  }

  // --- ENVOI ---
  await bot.sendMessage(chatId, `🌀 Envoi sur ${allThreadID.length} groupes détectés.`);

  let photoToSend = currentMsg?.photo?.length ? currentMsg.photo[currentMsg.photo.length - 1].file_id : null;
  let videoToSend = currentMsg?.video?.file_id || currentMsg?.animation?.file_id;

  for (const thread of allThreadID) {
    try {
        const styledMessage = `⚡ <b>NOTIFICATION</b> ⚡\n\n${textMessage}\n\n— Camille 🤍`;
        
        if (photoToSend) await bot.sendPhoto(thread.threadID, photoToSend, { caption: styledMessage, parse_mode: "HTML" });
        else if (videoToSend) await bot.sendVideo(thread.threadID, videoToSend, { caption: styledMessage, parse_mode: "HTML" });
        else await bot.sendMessage(thread.threadID, styledMessage, { parse_mode: "HTML" });
        
        await new Promise(r => setTimeout(r, 300));
    } catch (e) {
        console.log(`[DEBUG NOTI] Erreur sur ${thread.threadID} : ${e.message}`);
    }
  }
  
  return bot.sendMessage(chatId, "✅ Fin de diffusion.");
}

module.exports = { nix, onStart };

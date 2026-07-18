const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const nix = {
  name: "notification",
  version: "14.0.0",
  aliases: ["notify", "noti"],
  description: "Broadcast Pro Canvas avec Avatars et Heure",
  author: "Camille Uchiha",
  prefix: false, // Accessible sans préfixe selon ta configuration d'origine
  category: "owner",
  type: "admin", // Réservé à l'administration
  cooldown: 5,
  guide: "{pn} [votre message]"
};

// Mémoire des notifications pour gérer le routage des réponses
if (!global.telegramNotificationMemory) {
  global.telegramNotificationMemory = new Map();
}

// Identifiants Telegram des Créateurs Suprêmes admis à diffuser
const ADMIN_IDS = ["61591108301616", "61577875842514"];

async function getBuffer(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 5000 });
    return Buffer.from(response.data);
  } catch {
    return null;
  }
}

async function drawAvatar(ctx, buffer, x, y, radius, fallbackLetter, fallbackBg) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  if (buffer) {
    try {
      const img = await loadImage(buffer);
      ctx.drawImage(img, x, y, radius * 2, radius * 2);
      ctx.restore();
      return;
    } catch {}
  }

  ctx.fillStyle = fallbackBg;
  ctx.fillRect(x, y, radius * 2, radius * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${radius}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fallbackLetter, x + radius, y + radius);
  ctx.restore();
}

async function onStart({ bot, args, message, msg }) {
  const currentMsg = message || msg;
  const chatId = currentMsg?.chat?.id;
  const senderID = String(currentMsg?.from?.id);

  const sendReply = async (text) => {
    try {
      if (currentMsg && typeof currentMsg.reply === "function") return await currentMsg.reply(text);
      if (bot && typeof bot.sendMessage === "function") return await bot.sendMessage(chatId, text);
    } catch (e) { console.error("[noti] Erreur d'envoi :", e.message); }
  };

  if (!ADMIN_IDS.includes(senderID)) {
    return sendReply("⚠️ Action réservée à l'administrateur système.");
  }

  const textToDraw = args.join(" ").trim();
  if (!textToDraw) return sendReply("⚠️ [SYSTEM] ERREUR: Contenu du message vide.");

  const cacheDir = path.join(__dirname, "cache");
  const cachePath = path.join(cacheDir, `noti_pro_${Date.now()}.jpg`);
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  // 1. Récupération des informations de l'administrateur
  const adminName = (currentMsg.from.first_name || "") + (currentMsg.from.last_name ? " " + currentMsg.from.last_name : "") || "Administrateur";
  let adminAvatarBuffer = null;
  try {
    const photos = await bot.getUserProfilePhotos(currentMsg.from.id, { limit: 1 });
    if (photos && photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const fileLink = await bot.getFileLink(fileId);
      adminAvatarBuffer = await getBuffer(fileLink);
    }
  } catch {}

  // 2. Définition des groupes cibles
  // Note : Telegram ne permet pas nativement de lister tous les groupes rejoints à la volée.
  // Tu peux utiliser un tableau d'IDs manuels ou extraire les IDs actifs depuis ton SQLite global.threadsData si configuré.
  let targetGroupIds = []; 
  if (global.threadsData && typeof global.threadsData.getAll === "function") {
    const list = await global.threadsData.getAll();
    targetGroupIds = list.map(t => String(t.threadID));
  } else {
    // Liste de secours manuelle si ta DB n'est pas encore liée
    targetGroupIds = [String(chatId)]; 
  }

  if (!targetGroupIds.length) return sendReply("❌ [SYSTEM] INFO: Aucun groupe cible disponible.");

  await sendReply(`[SYSTEM] Envoi en cours.. ⏳ (${targetGroupIds.length} canaux/groupes)...`);

  const bgImageUrl = "https://i.ibb.co/F44C5WTs/e2648878efd8.jpg";
  let bgImage = null;
  const bgBuffer = await getBuffer(bgImageUrl);
  if (bgBuffer) {
    try { bgImage = await loadImage(bgBuffer); } catch {}
  }

  let sendSuccess = 0;
  const sendError = [];

  for (const targetId of targetGroupIds) {
    let groupName = "Groupe sans nom";
    let groupAvatarBuffer = null;

    try {
      const chatInfo = await bot.getChat(targetId);
      groupName = chatInfo.title || chatInfo.first_name || groupName;
      if (chatInfo.photo && chatInfo.photo.small_file_id) {
        const fileLink = await bot.getFileLink(chatInfo.photo.small_file_id);
        groupAvatarBuffer = await getBuffer(fileLink);
      }
    } catch {}

    const now = new Date();
    const timeString = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    try {
      const canvas = createCanvas(1200, 675);
      const ctx = canvas.getContext("2d");

      if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      } else {
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, "#0f141c");
        bgGradient.addColorStop(1, "#080b10");
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const boxX = 40, boxY = 40, boxW = canvas.width - 80, boxH = canvas.height - 80;
      ctx.fillStyle = "rgba(17, 22, 30, 0.9)";
      ctx.strokeStyle = "rgba(229, 26, 36, 0.8)";
      ctx.lineWidth = 4;
      
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#E51A24";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("▍ SYSTEM BROADCAST", boxX + 40, boxY + 65);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "26px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Envoyé à ${timeString}`, boxX + boxW - 40, boxY + 65);
      ctx.textAlign = "left";

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxX + 40, boxY + 100);
      ctx.lineTo(boxX + boxW - 40, boxY + 100);
      ctx.stroke();

      await drawAvatar(ctx, adminAvatarBuffer, boxX + 40, boxY + 130, 45, adminName.charAt(0), "#3b5998");
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(adminName, boxX + 150, boxY + 170);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "18px sans-serif";
      ctx.fillText("Administrateur Système", boxX + 150, boxY + 200);

      const groupAvatarX = boxX + boxW - 130;
      await drawAvatar(ctx, groupAvatarBuffer, groupAvatarX, boxY + 130, 45, groupName.charAt(0), "#1db954");
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(groupName, groupAvatarX - 20, boxY + 170);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "18px sans-serif";
      ctx.fillText("Groupe Destinataire", groupAvatarX - 20, boxY + 200);
      ctx.textAlign = "left";

      ctx.beginPath();
      ctx.moveTo(boxX + 40, boxY + 250);
      ctx.lineTo(boxX + boxW - 40, boxY + 250);
      ctx.stroke();

      ctx.fillStyle = "#EAEAEA";
      ctx.font = "30px sans-serif";
      
      const words = textToDraw.split(" ");
      let line = "";
      const lines = [];
      const maxWidth = boxW - 100;
      const lineHeight = 48;

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      let textY = boxY + 320;
      for (let k = 0; k < lines.length; k++) {
        if (textY < boxY + boxH - 50) {
          ctx.fillText(lines[k], boxX + 50, textY);
          textY += lineHeight;
        }
      }

      const buffer = canvas.toBuffer("image/jpeg", { quality: 0.95 });
      fs.writeFileSync(cachePath, buffer);

      const sentMsg = await bot.sendPhoto(targetId, cachePath, {
        caption: `📢 <b>Alerte Système Administration</b>`,
        parse_mode: "HTML"
      });

      if (sentMsg) {
        sendSuccess++;
        // Mémorisation de la clé de routage du message
        global.telegramNotificationMemory.set(String(sentMsg.message_id) + "_" + String(targetId), {
          groupName,
          threadID: targetId
        });
      }

      // Petite latence anti-flood régulée
      await new Promise(resolve => setTimeout(resolve, 350));

    } catch (err) {
      sendError.push({ threadID: targetId, groupName, error: err.message });
    }
  }

  setTimeout(() => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); }, 15000);

  let bilan = `📊 <b>[BILAN DIFFUSION]</b>\n🟢 Réussis: ${sendSuccess}\n🔴 Échecs: ${sendError.length}`;
  if (sendError.length) {
    sendError.forEach(err => { bilan += `\n- ${err.groupName}: ${err.error}`; });
  }
  return sendReply(bilan);
}

// Intercepteur global de réponses (onChat) pour acheminer les retours vers l'admin
async function onChat({ bot, message, msg }) {
  const currentMsg = message || msg;
  const replyToMessage = currentMsg?.reply_to_message;
  
  if (!replyToMessage) return;

  const currentChatId = String(currentMsg.chat.id);
  const replyTargetId = String(replyToMessage.message_id);

  const mapKey = replyTargetId + "_" + currentChatId;
  const context = global.telegramNotificationMemory.get(mapKey);

  if (!context) return;

  // L'utilisateur a cliqué sur "Répondre" à l'alerte système reçue
  const userName = (currentMsg.from.first_name || "") + (currentMsg.from.last_name ? " " + currentMsg.from.last_name : "") || "Utilisateur";
  const userID = currentMsg.from.id;

  const adminMessage = `📥 <b>[RÉPONSE DÉTECTÉE]</b>\n👤 <b>Expéditeur:</b> ${userName} (ID: <code>${userID}</code>)\n👥 <b>Groupe:</b> ${context.groupName} (ID: <code>${context.threadID}</code>)\n\n💬 <b>Message:</b>\n${currentMsg.text || "[Média/Autre]"}\n\n───\n⚠️ <i>Utilise la commande /callad pour rétablir une session de chat en direct si nécessaire.</i>`;

  // Expédition du rapport vers le premier administrateur de la liste
  try {
    if (ADMIN_IDS.length > 0) {
      await bot.sendMessage(ADMIN_IDS[0], adminMessage, { parse_mode: "HTML" });
    }
  } catch (e) {
    console.error("[noti-reply] Échec acheminement admin :", e.message);
  }
}

module.exports = { nix, onStart, onChat };

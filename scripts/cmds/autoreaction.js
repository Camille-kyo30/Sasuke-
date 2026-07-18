const fs = require("fs-extra");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "cache", "autoreaction_config.json");

const nix = {
  name: "autoreaction",
  version: "2.0.0",
  aliases: ["autoreact", "reactrule"],
  description: "Auto-réactions textuelles + Miroir universel de TOUS les émojis",
  author: "Camille Uchiha",
  prefix: true,
  category: "fun",
  type: "anyone",
  cooldown: 3,
  guide: "{pn} add [mot] [emoji] | {pn} remove [mot] | {pn} list | {pn} stop | {pn} on"
};

// Base de données par défaut contenant l'ensemble des catégories 1 à 6
const defaultRules = {
  rules: [
    // 1. Les Salutations
    { keyword: "bonjour", emoji: "👋" },
    { keyword: "salut", emoji: "👋" },
    { keyword: "slt", emoji: "👋" },
    { keyword: "cc", emoji: "👋" },
    { keyword: "hey", emoji: "👀" },
    { keyword: "wesh", emoji: "👋" },
    { keyword: "bonsoir", emoji: "👋" },
    { keyword: "yo", emoji: "👋" },
    { keyword: "coucou", emoji: "❤️" },

    // 2. Les Insultes et Clashes
    { keyword: "fdp", emoji: "💀" },
    { keyword: "con", emoji: "🤫" },
    { keyword: "merde", emoji: "🚫" },
    { keyword: "tg", emoji: "🤫" },
    { keyword: "ta gueule", emoji: "🤫" },
    { keyword: "pute", emoji: "🚫" },
    { keyword: "salaud", emoji: "🖕" },
    { keyword: "imbécile", emoji: "🤫" },
    { keyword: "clochard", emoji: "💀" },

    // 3. Les Rires et l'Humour
    { keyword: "mdr", emoji: "😂" },
    { keyword: "ptdr", emoji: "🤣" },
    { keyword: "xptdr", emoji: "🤣" },
    { keyword: "haha", emoji: "😂" },
    { keyword: "jure", emoji: "😭" },
    { keyword: "mdrr", emoji: "😂" },
    { keyword: "lmao", emoji: "🤣" },
    { keyword: "lol", emoji: "😂" },
    { keyword: "😂", emoji: "🤣" },

    // 4. Le Bot lui-même
    { keyword: "bot", emoji: "🤖" },
    { keyword: "mini bot", emoji: "🤖" },
    { keyword: "robot", emoji: "💻" },
    { keyword: "l'ia", emoji: "🤖" },
    { keyword: "connecté", emoji: "🔥" },
    { keyword: "bug", emoji: "💻" },
    { keyword: "camille", emoji: "👑" },

    // 5. Les Expressions de Choc ou Surprise
    { keyword: "quoi", emoji: "🧐" },
    { keyword: "waw", emoji: "😲" },
    { keyword: "incroyable", emoji: "🤯" },
    { keyword: "omg", emoji: "😱" },
    { keyword: "wtf", emoji: "🧐" },
    { keyword: "punaise", emoji: "😲" },
    { keyword: "choqué", emoji: "🤯" },
    { keyword: "wlh", emoji: "😱" },

    // 6. L'Amour et l'Amitié
    { keyword: "je t'aime", emoji: "❤️" },
    { keyword: "jetaime", emoji: "❤️" },
    { keyword: "je t'adore", emoji: "🥰" },
    { keyword: "mon sang", emoji: "💍" },
    { keyword: "frérot", emoji: "👑" },
    { keyword: "bg", emoji: "😏" },
    { keyword: "belle", emoji: "😏" },
    { keyword: "coeur", emoji: "❤️" }
  ]
};

// Initialisation et injection automatique des mots-clés par défaut
if (!fs.existsSync(CONFIG_PATH)) {
  fs.ensureDirSync(path.dirname(CONFIG_PATH));
  fs.writeJsonSync(CONFIG_PATH, defaultRules);
}

function getConfig() { return fs.readJsonSync(CONFIG_PATH); }
function saveConfig(data) { fs.writeJsonSync(CONFIG_PATH, data); }

async function onStart({ bot, args, message, msg, usages }) {
  const sendReply = async (text) => {
    try {
      if (message && typeof message.reply === "function") {
        return await message.reply(text);
      } else if (bot && typeof bot.sendMessage === "function") {
        const chatId = message?.chat?.id || msg?.chat?.id;
        if (chatId) return await bot.sendMessage(chatId, text);
      } else if (msg && typeof msg.reply === "function") {
        return await msg.reply(text);
      }
    } catch (e) {
      console.error("[autoreaction] Erreur d'envoi Telegram:", e.message);
    }
  };

  const chatId = String(message?.chat?.id || msg?.chat?.id);
  const config = getConfig();

  if (!global.autoreact_status) global.autoreact_status = new Map();

  if (!args || args.length === 0) {
    const currentStatus = global.autoreact_status.get(chatId) === "off" ? "🛑 DÉSACTIVÉ" : "✅ ACTIVÉ";
    return sendReply(
      `⚙️ ─── 『 AUTO-REACTION v2 』 ─── ⚙️\n\n` +
      `📊 Statut Miroir & Mots-clés : ${currentStatus}\n\n` +
      `👉 \`/autoreaction add [mot] [emoji]\` : Ajouter un mot-clé\n` +
      `👉 \`/autoreaction remove [mot]\` : Supprimer un mot-clé\n` +
      `👉 \`/autoreaction list\` : Afficher les ${config.rules.length} mots-clés\n\n` +
      `👑 ─── 『 ZONE ADMIN BOT 』 ─── 👑\n` +
      `👉 \`/autoreaction stop\` : Désactiver le module (Anti-Spam)\n` +
      `👉 \`/autoreaction on\` : Réactiver le module`
    );
  }

  const action = args[0].toLowerCase();

  if (action === "stop" || action === "off") {
    global.autoreact_status.set(chatId, "off");
    return sendReply("🛑 L'Auto-Réaction et le Miroir d'émojis ont été désactivés dans ce groupe.");
  }

  if (action === "on" || action === "start") {
    global.autoreact_status.set(chatId, "on");
    return sendReply("✅ L'Auto-Réaction et le Miroir d'émojis sont de nouveau actifs !");
  }

  if (action === "add") {
    const keyword = args[1]?.toLowerCase();
    const emoji = args[2];

    if (!keyword || !emoji) {
      return sendReply("⚠️ Syntaxe incorrecte. Exemple : `/autoreaction add bonjour ❤️`.");
    }

    const exists = config.rules.find(r => r.keyword === keyword);
    if (exists) { exists.emoji = emoji; } else { config.rules.push({ keyword, emoji }); }

    saveConfig(config);
    return sendReply(`✅ Règle enregistrée : "${keyword}" déclenchera désormais ${emoji}.`);
  }

  if (action === "remove") {
    const keyword = args[1]?.toLowerCase();
    if (!keyword) return sendReply("⚠️ Précisez le mot-clé à supprimer.");

    const initialLength = config.rules.length;
    config.rules = config.rules.filter(r => r.keyword !== keyword);

    if (config.rules.length === initialLength) {
      return sendReply(`❌ Aucun mot-clé correspondant à "${keyword}" trouvé.`);
    }

    saveConfig(config);
    return sendReply(`🗑️ La règle pour le mot "${keyword}" a été supprimée.`);
  }

  if (action === "list") {
    if (config.rules.length === 0) return sendReply("ℹ️ Aucun mot-clé configuré.");
    const listText = config.rules.map((r, i) => `${i + 1}. [ ${r.keyword} ] ➡️ ${r.emoji}`).join("\n");
    return sendReply(`📋 Liste des mots-clés actifs :\n\n${listText}\n\n✨ Note : Le bot fait aussi automatiquement miroir sur TOUS les émojis du monde !`);
  }

  return sendReply("❌ Sous-commande inconnue.");
}

// Fonction d'écoute globale (à appeler depuis ton gestionnaire principal de messages s'il prend en compte 'onChat')
async function onChat({ bot, event, message, msg }) {
  const currentMsg = message || msg;
  const body = currentMsg?.text || currentMsg?.caption;
  const chatId = String(currentMsg?.chat?.id);
  const messageId = currentMsg?.message_id;

  if (!body || !chatId || !messageId) return;

  // Vérification du commutateur On/Off
  if (global.autoreact_status && global.autoreact_status.get(chatId) === "off") return;

  // Fonction universelle pour poser des réactions sur Telegram
  const setTelegramReaction = async (emojiStr) => {
    try {
      if (bot && typeof bot.setMessageReaction === "function") {
        await bot.setMessageReaction(chatId, messageId, emojiStr);
      } else if (bot && typeof bot.react === "function") {
        await bot.react(chatId, messageId, emojiStr);
      }
    } catch (e) {
      console.error("[autoreaction] Impossible d'appliquer la réaction :", e.message);
    }
  };

  // 1. DÉTECTION DU MIROIR UNIVERSEL DE TOUS LES ÉMOJIS
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
  const match = body.match(emojiRegex);
  
  if (match) {
    const detectedEmoji = match[0];
    return await setTelegramReaction(detectedEmoji);
  }

  // 2. DÉTECTION DES MOTS-CLÉS CLASSIQUES
  const config = getConfig();
  const textReceived = body.toLowerCase();

  for (const rule of config.rules) {
    if (textReceived.includes(rule.keyword)) {
      await setTelegramReaction(rule.emoji);
      break;
    }
  }
}

module.exports = { nix, onStart, onChat };

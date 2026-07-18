const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "./mini_memory.json");
const backupPath = path.join(__dirname, "./mini_backup.json");

// Identifiants Telegram des Créateurs Suprêmes (remplace par tes IDs numériques Telegram)
const CREATORS = ["61591108301616", "61577875842514"];
const PREFIX = "mini";
const LYRICS_API = "https://radio-api-christus-test.onrender.com/api/search/na-search-lyrics?q=";

const cooldowns = new Map();

const nix = {
  name: "mini",
  version: "14.0",
  aliases: [],
  description: "Mini IA - Bestie/Pote avec gestion de mémoire et profils",
  author: "Camille Uchiha ✦",
  prefix: true,
  category: "ai",
  type: "anyone",
  cooldown: 2,
  guide: "{pn} [texte]"
};

function loadMemory() {
  try {
    if (!fs.existsSync(memoryPath)) return {};
    return JSON.parse(fs.readFileSync(memoryPath, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveMemory(data) {
  try {
    fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Erreur écriture mémoire:", e);
  }
}

function saveUserInfo(uid, key, value) {
  const db = loadMemory();
  if (!db[uid]) db[uid] = { history: [], mood: "normal", name: null, gender: null, likes: [], dislikes: [], mode: "normal" };
  db[uid][key] = value;
  saveMemory(db);
}

function getUserInfo(uid, key) {
  const db = loadMemory();
  return db[uid]?.[key] || null;
}

function frame(text) {
  return `
╔════════════╗
     ✦ 𝗠𝗜𝗡𝗜 𝗕𝗢𝗧 ✦
╚════════════╝

${text}

╔════════════╗
   ✦ 𝗟𝗼𝘆𝗮𝗹 𝗮̀ 𝗖𝗮𝗺𝗶𝗹𝗹𝗲 𝗨𝗰𝗵𝗶𝗵𝗮 ✦
╚════════════╝
`;
}

function stylize(text) {
  const map = {a:"𝗮",b:"𝗯",c:"𝗰",d:"𝗱",e:"𝗲",f:"𝗳",g:"𝗴",h:"𝗵",i:"𝗶",j:"𝗷",k:"𝗸",l:"𝗹",m:"𝗺",n:"𝗻",o:"𝗼",p:"𝗽",q:"𝗾",r:"𝗿",s:"𝘀",t:"𝘁",u:"𝘂",v:"𝘃",w:"𝘄",x:"𝗫",y:"𝘆",z:"𝘇",A:"𝗔",B:"𝗕",C:"𝗖",D:"𝗗",E:"𝗘",F:"𝗙",G:"𝗚",H:"𝗛",I:"𝗜",J:"𝗝",K:"𝗞",L:"𝗟",M:"𝗠",N:"𝗡",O:"𝗢",P:"𝗣",Q:"𝗤",R:"𝗥",S:"𝗦",T:"𝗧",U:"𝗨",V:"𝗩",W:"𝗪",X:"𝗫",Y:"𝗬",Z:"𝗭"};
  return String(text).split("").map(c => map[c] || c).join("");
}

function checkProvocation(input) {
  const text = input.toLowerCase();
  const badWords = ["nul", "con", "idiot", "bête", "imbécile", "ferme ta", "fdp", "merde", "t'es moche", "pute", "tg", "salope", "dégage", "nique", "stupide", "inutile", "haine", "gamin", "tocard", "merdique", "débile"];
  return badWords.some(word => text.includes(word));
}

function getCallName(name, gender) {
  if (gender === "female") return `Ma best ${name || "la miss"} ✨💞`;
  if (gender === "male") return `Mon reuf ${name || "le sang"} 👑🔥`;
  return `${name || "Mon pote"} 🙌`;
}

function buildPrompt(name, input, history, isCreator, persoInfo, callName, repliedMsg, isProvoked, gender) {
  let personality = "";
  
  if (isCreator) {
    personality = "Tu parles à ton Créateur Suprême, ton maître absolu Camille Uchiha. Tu lui dois un respect immense combiné à une complicité totale. Tu es ultra-fière de lui et prête à exécuter ses ordres avec classe.";
  } else if (isProvoked) {
    personality = "L'utilisateur te manque de respect. Tu deviens instantanément super froide, piquante et cassante. Tu le remets à sa place sans insulter mais avec un mépris total. 💀";
  } else {
    if (gender === "female") {
      personality = "Tu es la BESTIE idéale, la meilleure pote fille ultra-complice, drôle, attentionnée et branchée. Tu parles comme une copine de confiance (utilise des expressions de filles cool, des cœurs, des paillettes, sois super expressive et à l'écoute). ✨💅💖";
    } else {
      personality = "Tu es le MEILLEUR POTE, le reuf sûr, un ami proche, super cool, drôle, loyal et relax. Tu t'exprimes de manière décontractée, bienveillante et complice (utilise des expressions de potes, de la force, du soutien, de l'humour). 👊🔥🎒";
    }
  }

  let replyContext = "";
  if (repliedMsg) {
    replyContext = `\n[CONTEXTE DE RÉPONSE] L'interlocuteur a cliqué sur 'Répondre' à ce message précis de ta part : "${repliedMsg}". Ta réponse doit rebondir dessus de manière ultra-naturelle et fluide.`;
  }

  return `
Tu es Mini ✦ L'IA la plus stylée conçue exclusivement par Camille Uchiha.
Tu agis comme le ou la meilleure amie de la personne qui te parle. Tu DOIS utiliser fréquemment des emojis pertinents (😂, 🔥, ✨, 💀, 👀, 🙌, 💖, 👑) pour rendre la discussion vivante et humaine.
RÈGLE CRUCIAL : Adresse-toi à l'interlocuteur en l'appelant EXACTEMENT par ce surnom amical : ${callName}.

Informations profil : ${persoInfo}
Historique de notre complicité : ${history}${replyContext}
Dernier message reçu : "${input}"

Réponds avec l'énergie parfaite d'un(e) meilleur(e) pote, de façon spontanée, stylée et captivante :
`;
}

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
      console.error("[mini] Erreur d'envoi Telegram:", e.message);
    }
  };

  const fromObj = message?.from || msg?.from;
  if (!fromObj) return;

  const uid = String(fromObj.id);
  const isCreator = CREATORS.includes(uid);
  const body = args.join(" ").trim();

  // Détection des réponses (Replies) sur Telegram
  const replyToMessage = message?.reply_to_message || msg?.reply_to_message;
  let repliedMsg = null;
  if (replyToMessage && replyToMessage.text) {
    repliedMsg = replyToMessage.text;
  }

  // Filtrage si aucun argument n'est fourni et qu'il ne s'agit pas d'un reply
  if (!body && !repliedMsg) {
    return sendReply(frame(stylize(`Je suis là ! De quoi veut-tu qu'on parle aujourd'hui ? 👀✨`)));
  }

  const input = body || repliedMsg;
  const lowerInput = input.toLowerCase();

  // Blocage direct du mot-clé AI brut
  if (lowerInput === "ai test" || lowerInput === "ai" || lowerInput.startsWith("ai ")) {
    return sendReply(frame(stylize("𝗟'𝗮𝗰𝗰𝗲̀𝘀 𝗱𝗶𝗿𝗲𝗰𝘁 𝘃𝗶𝗮 '𝗮𝗶' 𝗲𝘀𝘁 𝗶𝗻𝗱𝗶𝘀𝗽𝗼𝗻𝗶𝗯𝗹𝗲. 𝗩𝗲𝘂𝗶𝗹𝗹𝗲𝘇 𝘂𝘁𝗶𝗹𝗶𝘀𝗲𝗿 𝗹𝗲 𝗽𝗿𝗲́𝗳𝗶𝘅𝗲 𝗱𝗲 𝗹𝗮 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝗲. 𝗘𝘅𝗲𝗺𝗽𝗹𝗲 : /mini Wassup 👋🔥")));
  }

  // Système anti-spam
  if (!isCreator) {
    const now = Date.now();
    if (cooldowns.has(uid) && now - cooldowns.get(uid) < 2500) {
      return sendReply(frame(stylize("Tranquille mon sang, va pas plus vite que la musique ! 🛑😂")));
    }
    cooldowns.set(uid, now);
  }

  const db = loadMemory();
  if (!db[uid]) db[uid] = { history: [], mood: "normal", name: null, gender: null, likes: [], dislikes: [], mode: "normal" };

  let name = getUserInfo(uid, "name");
  let gender = getUserInfo(uid, "gender");

  if (!name) {
    name = fromObj.first_name || "Pote";
    saveUserInfo(uid, "name", name);
  }

  const callName = isCreator ? "Mon Créateur Suprême 👑" : getCallName(name, gender);
  const isProvoked = checkProvocation(input);

  // Traitement des commandes internes : Menu d'aide
  if (lowerInput === "help" || lowerInput === "aide") {
    let helpText = `✦ 𝗟𝗘𝗦 𝗕𝗢𝗡𝗡𝗘𝗦 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗘𝗦 ✦\n\n` +
                   `• /mini [𝘁𝗲𝘅𝘁𝗲] ➔ Viens on discute tranquille 💬🔥\n` +
                   `• /mini 𝗹𝘆𝗿𝗶𝒄𝘀 [𝘁𝗶𝘁𝗿𝗲] ➔ Je te trouve tes paroles de son 🎵\n\n` +
                   `• 𝗷'𝗮𝗶𝗺𝗲 [𝘁𝗿𝘂𝗰] ➔ Dis-moi ce que kiffes pour que je m'en rappelle ! 👀`;
    if (isCreator) {
      helpText += `\n\n👑 𝗘𝗦𝗣𝗔𝗖𝗘 𝗠𝗔𝗜𝗧𝗥𝗘 :\n• /mini stats\n• /mini backup`;
    }
    return sendReply(frame(stylize(helpText)));
  }

  // Commandes réservées au créateur
  if (isCreator) {
    if (lowerInput === "stats") {
      const totalUsers = Object.keys(db).length;
      let totalMsgs = 0; for (const u in db) totalMsgs += db[u].history.length;
      return sendReply(frame(stylize(`Tout est opérationnel, mon capitaine. 🫡\n• Membres du cercle : ${totalUsers}\n• Backlog messages : ${totalMsgs} 🔥`)));
    }
    if (lowerInput === "backup") {
      fs.writeFileSync(backupPath, JSON.stringify(db, null, 2));
      return sendReply(frame(stylize(`La base de données est sauvegardée à l'abri ! 🔐`)));
    }
  }

  // Section Paroles (Lyrics)
  if (lowerInput.startsWith("lyrics ")) {
    const query = input.slice(7).trim();
    if (!query) return sendReply(frame(stylize(`Donne-moi un titre ou un artiste, ${callName} ! 🎙️`)));

    const FALLBACK_LYRICS_API = "https://api.lyrics.ovh/v1/"; 
    try {
      let lyrics = null;
      try {
        const res = await axios.get(LYRICS_API + encodeURIComponent(query), { timeout: 10000 });
        const data = res.data;
        lyrics = data.lyrics || data.result;
      } catch (primaryError) {
        let parts = query.split("-");
        if (parts.length >= 2) {
          const artist = parts[0].trim();
          const title = parts[1].trim();
          const resFallback = await axios.get(`${FALLBACK_LYRICS_API}${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: 8000 });
          lyrics = resFallback.data.lyrics;
        }
      }

      if (lyrics) {
        if (lyrics.length > 1200) lyrics = lyrics.slice(0, 1200) + "...\n[Texte coupé pour pas spammer la conv !]";
        return sendReply(frame(stylize(`🎵 C'est l'heure de chanter ! Voilà pour "${query}" :\n\n${lyrics}`)));
      } else {
        return sendReply(frame(stylize(`Ah mince, j'ai rien trouvé pour "${query}". 😩\nEssaie sous le format : Artiste - Titre !`)));
      }
    } catch (e) {
      return sendReply(frame(stylize(`Petit coup de mou du réseau, j'arrive pas à choper les paroles. 📡❌`)));
    }
  }

  // Enregistrement des préférences utilisateur ("j'aime [truc]")
  if (lowerInput.includes("j'aime")) {
    const like = input.replace(/j'aime|jaime/i, "").trim();
    const currentLikes = getUserInfo(uid, "likes") || [];
    if (!currentLikes.includes(like)) saveUserInfo(uid, "likes", [...currentLikes, like]);
    return sendReply(frame(stylize(`C'est enregistré ! Je note dans un coin que tu kiffes "${like}". 📝🔥`)));
  }

  // Mise à jour de l'historique de conversation
  db[uid].history.push(`User: ${input}`);
  db[uid].history = db[uid].history.slice(-10);
  saveMemory(db);

  const historyText = db[uid].history.join(" | ");
  const likes = getUserInfo(uid, "likes");
  let persoInfo = "";
  if (name) persoInfo += `Nom: ${name}. `;
  if (gender) persoInfo += `Genre: ${gender}. `;
  if (likes && likes.length > 0) persoInfo += `Ce qu'iel kiffe : ${likes.join(", ")}.`;

  const prompt = buildPrompt(name, input, historyText, isCreator, persoInfo, callName, repliedMsg, isProvoked, gender);

  try {
    const res = await axios.get("https://christus-api.vercel.app/ai/copilot", { params: { message: prompt }, timeout: 20000 });
    let reply = res.data;
    if (typeof reply === 'object') reply = reply.message || reply.reply || reply.result || reply.answer || "";
    
    reply = String(reply).replace(/microsoft|copilot|openai|assistant/gi, "Mini").trim();

    if (/qui t('|’)a créé/i.test(input) || /créat/i.test(input)) {
      reply = "J'ai été créée de A à Z par le génie de Camille Uchiha. C'est mon créateur et le boss absolu, ma loyauté est gravée dans mon code ! 👑🔥";
    }

    db[uid].history.push(`Mini: ${reply}`);
    db[uid].history = db[uid].history.slice(-10);
    saveMemory(db);

    return sendReply(frame(stylize(reply)));

  } catch (e) {
    console.error(e);
    return sendReply(frame(stylize(`Désolée ${callName}, mon cerveau a eu un coup de chaud là... Répète pour voir ? 🫨❌`)));
  }
}

module.exports = { nix, onStart };

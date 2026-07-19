const fs = require("fs");
const path = require("path");

const nix = {
  name: "cmd",
  version: "1.17",
  aliases: ["cm"],             
  description: "Gérer les fichiers de commandes",         
  author: "Camille Uchiha 🍓",             
  prefix: true,         
  category: "owner",           
  type: "admin",         
  cooldown: 5,            
  guide: "{pn} load <nom> | {pn} loadAll"  
};

async function onStart({ bot, args, message, msg, chatId, userId }) {
  const currentMsg = message || msg;
  
  // Vérification de sécurité pour global.utils
  if (!global.utils) {
    return bot.sendMessage(chatId, "❌ Erreur critique : global.utils n'est pas initialisé.");
  }

  const { loadScripts } = global.utils;
  const action = args[0];

  if (action === "load") {
    const fileName = args[1];
    if (!fileName) return bot.sendMessage(chatId, "❌ Spécifie un nom de fichier.");
    
    try {
      const result = loadScripts("cmds", fileName, global.utils.log, global.GoatBot.configCommands, bot);
      bot.sendMessage(chatId, result.status === "success" ? `✅ Commande "${fileName}" chargée.` : `❌ Erreur : ${result.error.message}`);
    } catch (e) {
      bot.sendMessage(chatId, `❌ Erreur système : ${e.message}`);
    }
  } 
  else if (action === "loadAll") {
    const dir = path.join(process.cwd(), "scripts", "cmds");
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
    let successCount = 0;
    
    for (const file of files) {
      const name = file.replace(".js", "");
      const res = loadScripts("cmds", name, global.utils.log, global.GoatBot.configCommands, bot);
      if (res.status === "success") successCount++;
    }
    bot.sendMessage(chatId, `✅ ${successCount} commandes rechargées.`);
  }
}

module.exports = { nix, onStart };

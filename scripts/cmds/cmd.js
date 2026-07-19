const fs = require('fs');
const path = require('path');
const axios = require('axios');

const configPath = path.join(__dirname, '..', '..', 'config.json');

function loadConfig() {
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    if (!config.admin) config.admin = [];
    return config;
  } catch (error) {
    return { admin: [] };
  }
}

module.exports = {
  nix: {
    name: 'cmd',
    author: 'ArYAN',
    version: '0.0.2',
    description: 'Gestion avancée des commandes (Install via message ou URL)',
    usage: 'cmd <install|loadall|load|unload|reload> [args]',
    admin: true,
    category: 'Admin',
    prefix: false,
    aliases: ['cm']
  },

  async onStart({ message, args, userId }) {
    const config = loadConfig();
    if (!config.admin.includes(String(userId))) {
      return message.reply("❌ | Accès réservé aux administrateurs.");
    }

    const subcmd = args[0]?.toLowerCase();
    const cmdFolder = __dirname;
    const commands = global.teamnix?.cmds || new Map();

    function clearRequireCache(filePath) {
      const resolvedPath = require.resolve(filePath);
      delete require.cache[resolvedPath];
    }

    function registerCommand(cmd, commandsCollection) {
      if (!cmd || !cmd.nix?.name || typeof cmd.onStart !== 'function') return false;
      commandsCollection.set(cmd.nix.name.toLowerCase(), cmd);
      return true;
    }

    // --- INSTALLATION ---
    if (subcmd === 'install') {
      const fileName = args[1];
      if (!fileName?.endsWith('.js')) return message.reply('● Usage: `/cmd install nom.js` (Réponds au message contenant le code)');

      let code;
      // Cas 1: Réponse à un message contenant le code
      if (message.messageReply?.body) {
        code = message.messageReply.body;
      } 
      // Cas 2: URL fournie en argument
      else if (args[2]) {
        try {
          const res = await axios.get(args[2]);
          code = res.data;
        } catch (e) { return message.reply(`❌ Erreur URL: ${e.message}`); }
      } else {
        return message.reply('❌ | Veuillez répondre au message contenant le code ou fournir une URL.');
      }

      const filePath = path.join(cmdFolder, fileName);
      fs.writeFileSync(filePath, code, 'utf-8');
      
      try {
        clearRequireCache(filePath);
        const loaded = require(filePath);
        registerCommand(loaded, commands);
        return message.reply(`✅ | Commande "${loaded.nix.name}" installée et chargée !`);
      } catch (err) {
        return message.reply(`❌ Erreur de chargement: ${err.message}`);
      }
    }

    // --- AUTRES COMMANDES (loadall, unload, reload) ---
    // ... (Le reste de tes fonctions loadall/unload/reload restent identiques) ...
    
    else {
      message.reply('❌ Unknown subcommand. Utilisez install, loadall, unload, load, ou reload.');
    }
  }
};

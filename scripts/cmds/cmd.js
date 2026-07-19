const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

const { configCommands } = global.GoatBot;
const { log, loading, removeHomeDir } = global.utils;

function getDomain(url) {
	const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im;
	const match = url.match(regex);
	return match ? match[1] : null;
}

function isURL(str) {
	try {
		new URL(str);
		return true;
	} catch (e) { return false; }
}

const nix = {
	name: "cmd",
	version: "1.17",
	author: "NTKhang",
	editor: "Camille Uchiha 🍓",
	cooldown: 5,
	role: 2,
	category: "owner",
	description: {
		vi: "Quản lý các tệp lệnh của bạn",
		en: "Manage your command files"
	},
	guide: {
		vi: "   {pn} load <tên file lệnh>\n   {pn} loadAll\n   {pn} install <url> <tên file lệnh>\n   {pn} install <tên file lệnh> <code>",
		en: "   {pn} load <command file name>\n   {pn} loadAll\n   {pn} install <url> <command file name>\n   {pn} install <command file name> <code>"
	}
};

const langs = {
	vi: {
		missingFileName: "⚠ | Vui lòng nhập vào tên lệnh bạn muốn reload",
		loaded: "✓ | Đã load command \"%1\" thành công",
		loadedError: "✗ | Load command \"%1\" thất bại với lỗi\n%2: %3",
		loadedSuccess: "✓ | Đã load thành công (%1) command",
		loadedFail: "✗ | Load thất bại (%1) command\n%2",
		openConsoleToSeeError: "👀 | Hãy mở console để xem chi tiết lỗi",
		missingCommandNameUnload: "⚠ | Vui lòng nhập vào tên lệnh bạn muốn unload",
		unloaded: "✓ | Đã unload command \"%1\" thành công",
		unloadedError: "✗ | Unload command \"%1\" thất bại với lỗi\n%2: %3",
		missingUrlCodeOrFileName: "⚠ | Vui lòng nhập vào url hoặc code và tên file lệnh bạn muốn cài đặt",
		missingUrlOrCode: "⚠ | Vui lòng nhập vào url hoặc code của tệp lệnh bạn muốn cài đặt",
		missingFileNameInstall: "⚠ | Vui lòng nhập vào tên file để lưu lệnh (đuôi .js)",
		invalidUrl: "⚠ | Vui lòng nhập vào url hợp lệ",
		invalidUrlOrCode: "⚠ | Không thể lấy được mã lệnh",
		alreadExist: "⚠ | File lệnh đã tồn tại, bạn có chắc chắn muốn ghi đè lên file lệnh cũ không?\nThả cảm xúc bất kì vào tin nhắn này để tiếp tục",
		installed: "✓ | Đã cài đặt command \"%1\" thành công, file lệnh được lưu tại %2",
		installedError: "✗ | Cài đặt command \"%1\" thất bại với lỗi\n%2: %3",
		missingFile: "⚠ | Không tìm thấy tệp lệnh \"%1\"",
		invalidFileName: "⚠ | Tên tệp lệnh không hợp lệ"
	},
	en: {
		missingFileName: "⚠ | Please enter the command name you want to reload",
		loaded: "✓ | Loaded command \"%1\" successfully",
		loadedError: "✗ | Failed to load command \"%1\" with error\n%2: %3",
		loadedSuccess: "✓ | Loaded successfully (%1) command",
		loadedFail: "Failed to load (%1) command\n%2",
		openConsoleToSeeError: "👀 | Open console to see error details",
		missingCommandNameUnload: "⚠ | Please enter the command name you want to unload",
		unloaded: "✓ | Unloaded command \"%1\" successfully",
		unloadedError: "✗ | Failed to unload command \"%1\" with error\n%2: %3",
		missingUrlCodeOrFileName: "⚠ | Please enter the url or code and command file name you want to install",
		missingUrlOrCode: "⚠ | Please enter the url or code of the command file you want to install",
		missingFileNameInstall: "⚠ | Please enter the file name to save the command (with .js extension)",
		invalidUrl: "⚠ | Please enter a valid url",
		invalidUrlOrCode: "⚠ | Unable to get command code",
		alreadExist: "⚠ | The command file already exists, are you sure you want to overwrite the old command file?\nReact to this message to continue",
		installed: "✓ | Installed command \"%1\" successfully, the command file is saved at %2",
		installedError: "✗ | Failed to install command \"%1\" with error\n%2: %3",
		missingFile: "⚠ | Command file \"%1\" not found",
		invalidFileName: "⚠ | Invalid command file name"
	}
};

async function onStart({ bot, args, message, msg, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, event, commandName, getLang }) {
	const currentMsg = message || msg;
	const { unloadScripts, loadScripts } = global.utils;
	const commandNameText = commandName || nix.name;

	if (args[0] === "load" && args.length === 2) {
		if (!args[1]) return currentMsg.reply(getLang("missingFileName"));
		const infoLoad = loadScripts("cmds", args[1], log, configCommands, bot || api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
		if (infoLoad.status === "success") currentMsg.reply(getLang("loaded", infoLoad.name));
		else {
			currentMsg.reply(getLang("loadedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message) + "\n" + infoLoad.error.stack);
			console.log(infoLoad.errorWithThoutRemoveHomeDir);
		}
	}
	else if ((args[0] || "").toLowerCase() === "loadall" || (args[0] === "load" && args.length > 2)) {
		const fileNeedToLoad = args[0].toLowerCase() === "loadall" ?
			fs.readdirSync(__dirname)
				.filter(file =>
					file.endsWith(".js") &&
					!file.match(/(eg)\.js$/g) &&
					(process.env.NODE_ENV === "development" ? true : !file.match(/(dev)\.js$/g)) &&
					!configCommands.commandUnload?.includes(file)
				)
				.map(item => item.split(".")[0]) :
			args.slice(1);
		const arraySucces = [];
		const arrayFail = [];

		for (const fileName of fileNeedToLoad) {
			const infoLoad = loadScripts("cmds", fileName, log, configCommands, bot || api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
			if (infoLoad.status === "success") arraySucces.push(fileName);
			else arrayFail.push(` ! ${fileName} => ${infoLoad.error.name}: ${infoLoad.error.message}`);
		}

		let msgReply = "";
		if (arraySucces.length > 0) msgReply += getLang("loadedSuccess", arraySucces.length);
		if (arrayFail.length > 0) {
			msgReply += (msgReply ? "\n" : "") + getLang("loadedFail", arrayFail.length, arrayFail.join("\n"));
			msgReply += "\n" + getLang("openConsoleToSeeError");
		}
		currentMsg.reply(msgReply);
	}
	else if (args[0] === "unload") {
		if (!args[1]) return currentMsg.reply(getLang("missingCommandNameUnload"));
		const infoUnload = unloadScripts("cmds", args[1], configCommands, getLang);
		infoUnload.status === "success" ?
			currentMsg.reply(getLang("unloaded", infoUnload.name)) :
			currentMsg.reply(getLang("unloadedError", infoUnload.name, infoUnload.error.name, infoUnload.error.message));
	}
	else if (args[0] === "install") {
		let url = args[1];
		let fileName = args[2];
		let rawCode;

		if (!url || !fileName) return currentMsg.reply(getLang("missingUrlCodeOrFileName"));

		if (url.endsWith(".js") && !isURL(url)) {
			const tmp = fileName;
			fileName = url;
			url = tmp;
		}

		if (url.match(/(https?:\/\/(?:www\.|(?!www)))/)) {
			global.utils.log.dev("install", "url", url);
			if (!fileName || !fileName.endsWith(".js")) return currentMsg.reply(getLang("missingFileNameInstall"));

			const domain = getDomain(url);
			if (!domain) return currentMsg.reply(getLang("invalidUrl"));

			if (domain === "pastebin.com") {
				const regex = /https:\/\/pastebin\.com\/(?!raw\/)(.*)/;
				if (url.match(regex)) url = url.replace(regex, "https://pastebin.com/raw/$1");
				if (url.endsWith("/")) url = url.slice(0, -1);
			}
			else if (domain === "github.com") {
				const regex = /https:\/\/github\.com\/(.*)\/blob\/(.*)/;
				if (url.match(regex)) url = url.replace(regex, "https://raw.githubusercontent.com/$1/$2");
			}

			rawCode = (await axios.get(url)).data;

			if (domain === "savetext.net") {
				const $ = cheerio.load(rawCode);
				rawCode = $("#content").text();
			}
		}
		else {
			const bodyText = event.body || currentMsg.text || "";
			global.utils.log.dev("install", "code", args.slice(1).join(" "));
			if (args[args.length - 1].endsWith(".js")) {
				fileName = args[args.length - 1];
				rawCode = bodyText.slice(bodyText.indexOf('install') + 7, bodyText.indexOf(fileName) - 1);
			}
			else if (args[1].endsWith(".js")) {
				fileName = args[1];
				rawCode = bodyText.slice(bodyText.indexOf(fileName) + fileName.length + 1);
			}
			else return currentMsg.reply(getLang("missingFileNameInstall"));
		}

		if (!rawCode) return currentMsg.reply(getLang("invalidUrlOrCode"));

		if (fs.existsSync(path.join(__dirname, fileName))) {
			return currentMsg.reply(getLang("alreadExist"), (err, info) => {
				const targetID = info?.messageID || info?.message_id;
				if (targetID && global.GoatBot?.onReaction) {
					global.GoatBot.onReaction.set(targetID, {
						commandName: commandNameText,
						messageID: targetID,
						type: "install",
						author: event.senderID || currentMsg.from?.id,
						data: { fileName, rawCode }
					});
				}
			});
		}
		else {
			const infoLoad = loadScripts("cmds", fileName, log, configCommands, bot || api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);
			infoLoad.status === "success" ?
				currentMsg.reply(getLang("installed", infoLoad.name, path.join(__dirname, fileName).replace(process.cwd(), ""))) :
				currentMsg.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
		}
	}
	else {
		if (typeof currentMsg.SyntaxError === "function") currentMsg.SyntaxError();
		else bot.sendMessage(event.chat.id, `❌ Mauvaise syntaxe.`);
	}
}

async function onReaction({ bot, Reaction, message, msg, event, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang }) {
	const currentMsg = message || msg;
	const { loadScripts } = global.utils;
	const { author, data: { fileName, rawCode } } = Reaction;
	const currentUserID = event.userID || event.from?.id;
	if (currentUserID != author) return;
	
	const infoLoad = loadScripts("cmds", fileName, log, configCommands, bot || api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);
	infoLoad.status === "success" ?
		currentMsg.reply(getLang("installed", infoLoad.name, path.join(__dirname, fileName).replace(process.cwd(), ""))) :
		currentMsg.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
}

// Systèmes d'injection globaux (conservés)
const packageAlready = [];
const spinner = "\\|/-";
let count = 0;

function loadScripts(folder, fileName, log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode) {
	const storageCommandFilesPath = global.GoatBot[folder == "cmds" ? "commandFilesPath" : "eventCommandsFilesPath"];
	try {
		if (rawCode) {
			fileName = fileName.slice(0, -3);
			fs.writeFileSync(path.normalize(`${process.cwd()}/scripts/${folder}/${fileName}.js`), rawCode);
		}
		const regExpCheckPackage = /require(\s+|)\((\s+|)[`'"]([^`'"]+)[`'"](\s+|)\)/g;
		const { GoatBot } = global;
		const { onFirstChat: allOnFirstChat, onChat: allOnChat, onEvent: allOnEvent, onAnyEvent: allOnAnyEvent } = GoatBot;
		let setMap, typeEnvCommand, commandType;
		if (folder == "cmds") {
			typeEnvCommand = "envCommands"; setMap = "commands"; commandType = "command";
		}
		else if (folder == "events") {
			typeEnvCommand = "envEvents"; setMap = "eventCommands"; commandType = "event command";
		}
		let pathCommand;
		if (process.env.NODE_ENV == "development") {
			const devPath = path.normalize(process.cwd() + `/scripts/${folder}/${fileName}.dev.js`);
			pathCommand = fs.existsSync(devPath) ? devPath : path.normalize(process.cwd() + `/scripts/${folder}/${fileName}.js`);
		}
		else pathCommand = path.normalize(process.cwd() + `/scripts/${folder}/${fileName}.js`);

		const contentFile = fs.readFileSync(pathCommand, "utf8");
		let allPackage = contentFile.match(regExpCheckPackage);
		if (allPackage) {
			allPackage = allPackage
				.map(p => p.match(/[`'"]([^`'"]+)[`'"]/)[1])
				.filter(p => p.indexOf("/") !== 0 && p.indexOf("./") !== 0 && p.indexOf("../") !== 0 && p.indexOf(__dirname) !== 0);
			for (let packageName of allPackage) {
				packageName = packageName.startsWith('@') ? packageName.split('/').slice(0, 2).join('/') : packageName.split('/')[0];
				if (!packageAlready.includes(packageName)) {
					packageAlready.push(packageName);
					if (!fs.existsSync(`${process.cwd()}/node_modules/${packageName}`)) {
						let wating;
						try {
							wating = setInterval(() => { count++; loading.info("PACKAGE", `Installing ${packageName} ${spinner[count % spinner.length]}`); }, 80);
							execSync(`npm install ${packageName} --save`, { stdio: "pipe" });
							clearInterval(wating);
						} catch (error) { clearInterval(wating); throw new Error(`Can't install package ${packageName}`); }
					}
				}
			}
		}
		const oldCommand = require(pathCommand);
		const oldCommandName = oldCommand?.config?.name || oldCommand?.nix?.name;
		if (oldCommandName && GoatBot[setMap].get(oldCommandName)?.location != pathCommand) {
			throw new Error(`${commandType} name "${oldCommandName}" already exists`);
		}
		if (oldCommand?.config?.aliases || oldCommand?.nix?.aliases) {
			let oldAliases = oldCommand?.config?.aliases || oldCommand?.nix?.aliases || [];
			if (typeof oldAliases == "string") oldAliases = [oldAliases];
			for (const alias of oldAliases) GoatBot.aliases.delete(alias);
		}
		delete require.cache[require.resolve(pathCommand)];

		const command = require(pathCommand);
		command.location = pathCommand;
		const configCommand = command.config || command.nix;
		if (!configCommand || typeof configCommand != "object") throw new Error("config/nix structure missing");
		const scriptName = configCommand.name;

		const indexOnChat = allOnChat.findIndex(item => item == oldCommandName);
		if (indexOnChat != -1) allOnChat.splice(indexOnChat, 1);
		const indexOnFirstChat = allOnChat.findIndex(item => item == oldCommandName);
		let oldOnFirstChat;
		if (indexOnFirstChat != -1) { oldOnFirstChat = allOnFirstChat[indexOnFirstChat]; allOnFirstChat.splice(indexOnFirstChat, 1); }
		const indexOnEvent = allOnEvent.findIndex(item => item == oldCommandName);
		if (indexOnEvent != -1) allOnEvent.splice(indexOnEvent, 1);
		const indexOnAnyEvent = allOnAnyEvent.findIndex(item => item == oldCommandName);
		if (indexOnAnyEvent != -1) allOnAnyEvent.splice(indexOnAnyEvent, 1);

		if (command.onLoad) command.onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });

		const { envGlobal, envConfig } = configCommand;
		if (!command.onStart) throw new Error('Function onStart missing!');
		if (!scriptName) throw new Error('Name missing!');
		
		if (configCommand.aliases) {
			let { aliases } = configCommand;
			if (typeof aliases == "string") aliases = [aliases];
			for (const alias of aliases) {
				if (GoatBot.aliases.has(alias)) GoatBot.aliases.delete(alias);
				GoatBot.aliases.set(alias, scriptName);
			}
		}
		if (envGlobal && typeof envGlobal == "object") {
			for (const key in envGlobal) configCommands.envGlobal[key] = envGlobal[key];
		}
		if (envConfig && typeof envConfig == "object") {
			if (!configCommands[typeEnvCommand][scriptName]) configCommands[typeEnvCommand][scriptName] = {};
			configCommands[typeEnvCommand][scriptName] = envConfig;
		}
		GoatBot[setMap].delete(oldCommandName);
		GoatBot[setMap].set(scriptName, command);
		fs.writeFileSync(global.client.dirConfigCommands, JSON.stringify(configCommands, null, 2));

		if (command.onChat) allOnChat.push(scriptName);
		if (command.onEvent) allOnEvent.push(scriptName);
		if (command.onAnyEvent) allOnAnyEvent.push(scriptName);

		return { status: "success", name: fileName, command };
	} catch (err) {
		return { status: "failed", name: fileName, error: err };
	}
}

function unloadScripts(folder, fileName, configCommands, getLang) {
	const pathCommand = `${process.cwd()}/scripts/${folder}/${fileName}.js`;
	if (!fs.existsSync(pathCommand)) throw new Error("File not found");
	const command = require(pathCommand);
	const commandName = command.config?.name || command.nix?.name;
	const { GoatBot } = global;
	delete require.cache[require.resolve(pathCommand)];
	GoatBot[folder == "cmds" ? "commands" : "eventCommands"].delete(commandName);
	return { status: "success", name: fileName };
}

global.utils.loadScripts = loadScripts;
global.utils.unloadScripts = unloadScripts;

module.exports = { nix, langs, onStart, onReaction };

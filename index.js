require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const fs = require("fs");
const { checkBind } = require("./checker");

const bot = new Bot(process.env.BOT_TOKEN);
const DB_FILE = "./users.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function isUserJoined(ctx) {
  try {
    const member = await ctx.api.getChatMember(
      process.env.GROUP_USERNAME,
      ctx.from.id,
    );
    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

bot.start((ctx) => {});

bot.command("start", async (ctx) => {
  const db = loadDB();
  const userId = ctx.from.id.toString();
  const joined = await isUserJoined(ctx);

  if (!db[userId]) {
    db[userId] = {
      username: ctx.from.username || null,
      first_name: ctx.from.first_name,
      joined_at: new Date().toISOString(),
    };

    saveDB(db);
  }

  if (!joined) {
    const keyboard = new InlineKeyboard().url(
      "🔗 Join Grup",
      `https://t.me/${process.env.GROUP_USERNAME.replace("@", "")}`,
    );

    return ctx.reply("Kamu harus join grup dulu sebelum menggunakan bot ini.", {
      reply_markup: keyboard,
    });
  }

  return ctx.reply("Format: /bind 123456789 1234");
});

bot.command("bind", async (ctx) => {
  const joined = await isUserJoined(ctx);

  if (!joined) {
    const keyboard = new InlineKeyboard().url(
      "🔗 Join Grup",
      `https://t.me/${process.env.GROUP_USERNAME.replace("@", "")}`,
    );

    return ctx.reply("Kamu harus join grup dulu sebelum menggunakan bot ini.", {
      reply_markup: keyboard,
    });
  }

  const args = ctx.message.text.split(" ");
  if (args.length < 3) {
    return ctx.reply("Format: /bind 123456789 1234");
  }

  const roleId = args[1];
  const zoneId = args[2];

  if (!/^\d+$/.test(roleId) || !/^\d+$/.test(zoneId)) {
    return ctx.reply("ID dan Server harus angka.");
  }

  const processingMsg = await ctx.reply("Ok.");

  const result = await checkBind(roleId, zoneId);

  if (!result) {
    return ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      "Data tidak ditemukan atau sudah tidak bisa diakses.",
    );
  }

  const bindList =
    Object.entries(result.binds || {})
      .map(([k, v]) => `• ${k}: ${v}`)
      .join("\n") || "• Tidak ada data";

  let deviceText = "• Tidak ada data";

  if (result.devices && Object.keys(result.devices).length > 0) {
    const filteredDevices = Object.entries(result.devices)
      .filter(([_, v]) => v && v.trim() !== "")
      .map(([k, v]) => `• ${k}: ${v}`);

    if (filteredDevices.length > 0) {
      deviceText = filteredDevices.join("\n");
    }
  }

  const text = `
🔎 ID: ${result.role_id || roleId} (Zone ${result.zone_id || zoneId})
-----------------------------------
👤 Nick: ${result.name || "-"}
🌍 Region: ${result.region || "-"}
📅 Tahun Dibuat: ${result.year_created || "-"}
-----------------------------------
🔗 Bind Account:
${bindList}
-----------------------------------
📱 Device Login:
${deviceText}
-----------------------------------
Source: MLBB Support API
`;

  await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, text);
});

bot.catch(console.error);
bot.start();

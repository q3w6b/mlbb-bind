const axios = require("axios");
const cheerio = require("cheerio");

function generateRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(
    Math.random() * 255,
  )}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
];

function randomDelay(min = 2000, max = 5000) {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)),
  );
}

async function getStackML(userId, zoneId) {
  try {
    const response = await axios.post(
      "https://api.naimstore.id/api/stack-ml",
      {
        user_id: userId,
        zone_id: zoneId,
      },
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Origin: "https://naimstore.id",
          Referer: "https://naimstore.id/",
        },
      },
    );

    if (response.data && response.data.status === true) {
      return {
        nick: response.data.data.nick,
        region: response.data.data.region,
      };
    }

    return null;
  } catch (err) {
    return null;
  }
}

async function checkBind(roleId, zoneId, retryCount = 5) {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await axios.post(
        "https://mlchecker.my.id/check-bind",
        {
          role_id: roleId,
          zone_id: zoneId,
        },
        {
          headers: {
            "X-Forwarded-For": generateRandomIP(),
            "X-Real-IP": generateRandomIP(),
            "Content-Type": "application/json",
            "User-Agent":
              userAgents[Math.floor(Math.random() * userAgents.length)],
            Referer: "https://mlchecker.my.id/",
            Origin: "https://mlchecker.my.id",
          },
          validateStatus: (status) => status >= 200 && status < 500,
        },
      );

      if (response.data && response.data.status === "success") {
        const $ = cheerio.load(response.data.html);

        const result = {
          role_id: null,
          zone_id: null,
          name: null,
          region: null,
          year_created: null,
          binds: {},
          devices: {},
        };

        $(".header-item").each((_, el) => {
          const label = $(el).find(".label").text().replace(":", "").trim();
          const value = $(el).find(".value").text().trim();

          if (label === "Role ID") result.role_id = value;
          if (label === "Zone ID") result.zone_id = value;
          if (label === "Name") result.name = value;
          if (label === "Year Created") result.year_created = value;
        });

        $(".bind-item").each((_, el) => {
          const platform = $(el)
            .find(".platform-name")
            .text()
            .replace("•", "")
            .replace(":", "")
            .trim();

          const value = $(el).find("span").last().text().trim();
          result.binds[platform] = value;
        });

        $(".device-section div").each((_, el) => {
          const text = $(el).text().trim();
          if (text.includes(":")) {
            const [platform, data] = text.split(":");
            result.devices[platform.replace("•", "").trim()] = data.trim();
          }
        });

        const stackData = await getStackML(roleId, zoneId);
        if (stackData) {
          result.name = stackData.nick;
          result.region = stackData.region;
        }

        return result;
      }

      if (attempt < retryCount) {
        await randomDelay(3000, 6000);
      }
    } catch (error) {
      if (attempt < retryCount) {
        await randomDelay(2000, 4000);
      }
    }
  }

  return null;
}

module.exports = { checkBind };

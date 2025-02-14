const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Hello from Express on Vercel!");
  });



const fs = require("fs");
const XLSX = require("xlsx");
const schedule = require("node-schedule");
const line = require("@line/bot-sdk");
require('dotenv').config();


// LINE Bot 設定
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(config);

// LINE 使用者 ID（手動設定，或使用 webhook 取得）
const USER_ID = process.env.LINE_USER_ID;

// Google Sheet

const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// 讀取 Excel 檔案並回傳通知訊息

async function getSheetData() {
    let messages = [];
    const serviceAccountAuth = new JWT({
        email:GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_PRIVATE_KEY,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });
    const doc = new GoogleSpreadsheet('1yZGksWNmRq_3FZppQlRP-h3SlbJPtr_QC8X4pf6Df40', serviceAccountAuth);

    const currentMonth = new Date().getMonth() + 1;


    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[1]; // 取得第一個工作表
    const rows = await sheet.getRows();  // 取得所有行
    rows.forEach(row => {
        const monthValue  = row._rawData[0]; // 假設 "月份" 是第一列（索引為 0）
        const monthNumber = parseInt(monthValue);

    if (monthNumber === currentMonth) {
        const money = row._rawData[1]; // 取得伙食金額
        // 加上換行字元，讓月份資訊另起一行
        messages.push(`家庭記帳本💰\n月份: ${monthValue}, 伙食金額: ${money}`);
    }
    });
    return messages.length > 0 ? messages.join("\n") : "今天沒有需要通知的資料。";

}


// 發送 LINE 訊息
async function sendLineMessage(message) {
    try {
        await client.pushMessage(USER_ID, { type: "text", text: message });
        console.log("通知發送成功！");
    } catch (error) {
        console.error("通知發送失敗：", error.response?.data || error.message);
    }
}

// 設定排程：每月 10、20、30 日上午 9:00 執行 '0 9 10,20,30 * *'
schedule.scheduleJob("45 10 5,10,14,20,30 * *", async () => {
    console.log("執行通知排程...");
    const message = await getSheetData();
    await sendLineMessage(message);
});

    
console.log("LINE Bot 通知機器人啟動中...");


const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

module.exports = app;

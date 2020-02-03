const axios = require("axios");
const qs = require("qs");
const fs = require("fs");

const dbqFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbqFile);
const sqlite3 = require("sqlite3").verbose();
const dbq = new sqlite3.Database(dbqFile);

const apiUrl = "https://slack.com/api";
const moment = require("moment");

const checkWeek = argdate => {
  var oneJan = new Date(argdate.getFullYear(), 0, 1);
  var day = Math.ceil((argdate - oneJan) / 86400000);
  var offset = oneJan.getDay() - 1;
  var week = Math.floor((day + offset) / 7) + 1;
  if (offset >= 5) week = week - 1;
  return week;
};

const addWeekBlock = (year, week, count, max, str) => {
  var cntstr = "";
  if (count > max) cntstr = `\`${count}\``;
  else cntstr = `${count}`;

  const weekOne = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${year} / ${week} week     count(s) : ${cntstr}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: str
      }
    },
    {
      type: "divider"
    }
  ];

  return weekOne;
};

/*
 * Home View - Use Block Kit Builder to compose: https://api.slack.com/tools/block-kit-builder
 */

function dball(sql, params) {
  return new Promise((resolve, reject) => {
    dbq.all(sql, params, (err, row) => {
      if (err) reject(err);
      console.log(sql);
      resolve(row);
    });
  });
}

const updateView = async user => {
  // Intro message -

  let blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Welcome! this is Snack counter.*"
      },
      accessory: {
        type: "button",
        action_id: "add_note",
        text: {
          type: "plain_text",
          text: "Snack!",
          emoji: true
        }
      }
    },

    {
      type: "divider"
    }
  ];

  // select snacks log
  try {
    var sql = `SELECT * FROM snacks WHERE uid = \"${user}\" ORDER BY time DESC`;
    var newData = await dball(sql);

    if (newData.length > 0) {
      let year = 0;
      let week0 = 0;
      let str = "";
      let count = 0;
      let max = 10;

      for (const o of newData) {
        // let flyer = o.flyer;
        let day = new Date(o.time);
        let week1 = checkWeek(day);

        year = day.getFullYear();
        if (week0 == 0) {
          str = o.val;
          week0 = week1;
          count = 1;
          continue;
        }
        if (week0 == week1) {
          // 連結する
          str = o.val.concat(str);
          count = count + 1;
          continue;
        }

        if ( str === "" ){ str = " "} // dummy
        
        blocks = blocks.concat(addWeekBlock(year, week0, count, max, str));
        str = "";
        week0 = week1;
        count = 0;
      }
      blocks = blocks.concat(addWeekBlock(year, week0, count, max, str));
    }

    // The final view -
    let view = {
      type: "home",
      title: {
        type: "plain_text",
        text: "Keep notes!"
      },
      blocks: blocks
    };

    return JSON.stringify(view);
  } catch (error) {
    console.error(error);
  }
};

/* Display App Home */

const displayHome = async (user, data) => {
  var qtoken = "";
  var rows = [];

  // get token
  rows = await dball(`SELECT token FROM users WHERE uid = \'${user}\'`);
  qtoken = rows[0].token;

  if (data) {
    // store a new log
    var sql = `INSERT INTO snacks(uid,time,val) VALUES(\"${user}\",\"${data.timestamp}\",\"${data.value}\")`;
    await dball(sql);
  }

  const args = {
    token: qtoken,
    user_id: user,
    view: await updateView(user)
  };
  
  const result = await axios.post(
    `${apiUrl}/views.publish`,
    qs.stringify(args)
  );

  try {
    if (result.data.error) {
      console.log("ERROR!" , result.data );
    }
  } catch (e) {
    console.log("CATCH!",e);
  }
};

// open modal
const openModal = async (trigger_id, user) => {
  const modal = {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Snack Counter"
    },
    submit: {
      type: "plain_text",
      text: "Create"
    },
    blocks: [
      // Drop-down menu
      {
        type: "input",
        block_id: "flyer",
        label: {
          type: "plain_text",
          text: "Select a Snack!"
        },
        element: {
          type: "static_select",
          action_id: "snack",
          initial_option: {
            text: {
              type: "plain_text",
              text: ":chocolate_bar:"
            },
            value: ":chocolate_bar:"
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: ":doughnut:"
              },
              value: ":doughnut:"
            },
            {
              text: {
                type: "plain_text",
                text: ":chocolate_bar:"
              },
              value: ":chocolate_bar:"
            },
            {
              text: {
                type: "plain_text",
                text: ":cake:"
              },
              value: ":cake:"
            },
            {
              text: {
                type: "plain_text",
                text: ":rice_cracker:"
              },
              value: ":rice_cracker:"
            },
            {
              text: {
                type: "plain_text",
                text: ":dango:"
              },
              value: ":dango:"
            }
          ]
        }
      }
    ]
  };

  // get token
  var rows = await dball(`SELECT token FROM users WHERE uid = \'${user}\'`);
  var qtoken = rows[0].token;
    
  const args = {
    token: qtoken,
    trigger_id: trigger_id,
    view: JSON.stringify(modal)
  };

  const result = await axios.post(`${apiUrl}/views.open`, qs.stringify(args));
};

/* Command operate */
const commandOperate = async (user, rawcmd, channel_id, response_url) => {
  // get token
  var rows = await dball(`SELECT token FROM users WHERE uid = \'${user}\'`);
  var qtoken = rows[0].token;
  var sql = ""
  
  const args = {
    token: qtoken,
    user_id: user,
    channel: channel_id,
    text: "*This is Snack Counter.*\nThe following commands are available:\n\n/snackcounter log   : show your logs\n/snackcounter reset   : reset your all logs\n/snackcounter delete ID   : delete ID record\n"
  };

  var cmds = rawcmd.split(/\s/);

  switch (cmds[0]) {
    case "reset":
      sql = `DELETE FROM snacks WHERE uid = \'${user}\'`
      await dball(sql)
      args.text = "reset all log";
      break;
    case "delete":
      sql = `DELETE FROM snacks WHERE uid = \'${user}\' AND rowid = \'${cmds[1]}\'`
      await dball(sql)
      args.text = `delete id: ${cmds[1]}`;
      break;
    case "log":
      sql = `SELECT *,rowid FROM snacks WHERE uid = \'${user}\'`
      const rawData = await dball(sql)
      args.text = "all snacks info\n";
      for (const o of rawData) {
        args.text = args.text.concat(`${o.rowid} : ${o.time} ${o.val}\n`);
      }
      break;
  }
  const result = await axios.post(
    `${apiUrl}/chat.postMessage`,
    qs.stringify(args)
  );
};

// infomation store
const preserveToken = async body => {
  const token = {
    access_token: JSON.parse(body).access_token,
    bot_access_token: JSON.parse(body).bot.bot_access_token,
    user_id: JSON.parse(body).user_id,
    team_id: JSON.parse(body).team_id
  };

  if (body) {
    dbq.serialize(() => {
      var sql = `REPLACE INTO users(uid,token) VALUES(\"${token.user_id}\",\"${token.bot_access_token}\")`;
      dbq.run(sql);
    });
  }
};

module.exports = { displayHome, openModal, commandOperate, preserveToken };

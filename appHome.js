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

const updateView = async ( user , team ) => {
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
    }
  ];

  // select snacks log
  try {
    var sql = `SELECT * FROM snacks WHERE uid = \"${user}\" AND teamid = \"${team}\" ORDER BY rowid DESC`;
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

        if (str === "") {
          str = " ";
        } // dummy

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

const updateViewNonUser = async => {
  // Intro message -
  let blocks_nonuser = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*Welcome! this is Snack counter.*\nClick here for install\nhttps://simacho.github.io/SnackCounter/instruction.html"
      }
    }
  ];

  // The final view -
  let view = {
    type: "home",
    title: {
      type: "plain_text",
      text: "Welcome to Snack counter."
    },
    blocks: blocks_nonuser
  };

  return JSON.stringify(view);
};

/* Display App Home */
const displayHome = async (user, team , token , data) => {
  var qtoken = "";
  var rows = [];

  // get token
  rows = await dball(`SELECT token FROM teams WHERE teamid = \'${team}\'`);

  if (rows.length > 0) {
    qtoken = rows[0].token;

    if (data) {
      // store a new log
      var sql = `INSERT INTO snacks(uid,teamid,time,val) VALUES(\"${user}\",\"${team}\",\"${data.timestamp}\",\"${data.value}\")`;
      await dball(sql);
    }

    const args = {
      token: qtoken,
      user_id: user,
      view: await updateView(user , team)
    };

    const result = await axios.post(
      `${apiUrl}/views.publish`,
      qs.stringify(args)
    );

    try {
      if (result.data.error) {
        console.log("ERROR!", result.data);
      }
    } catch (e) {
      console.log("CATCH!", e);
      }
  }
  else {
    
    const args = {
      token: token,
      user_id: user,
      view: await updateViewNonUser()
    };
    
    console.log("Non User Info " , args)

    /*
    const result = await axios.post(
      `${apiUrl}/views.publish`,
      qs.stringify(args)
    );
    
    console.log("Not authed user.")

  　try {
    　if (result.data.error) {
      console.log("ERROR!", result.data);
    　}
    } catch (e) {
      console.log("CATCH!", e);
    }
    */

  
  
  }

};

// open modal
const openModal = async (trigger_id, user , team) => {
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
  var rows = await dball(`SELECT token FROM teams WHERE teamid = \'${team}\'`);
  var qtoken = rows[0].token;

  const args = {
    token: qtoken,
    trigger_id: trigger_id,
    view: JSON.stringify(modal)
  };

  const result = await axios.post(`${apiUrl}/views.open`, qs.stringify(args));
};

/* Respond App Home Message */

const respondHomeMessage = async (user, team , rawcmd, channel_id) => {
  var rows = await dball(`SELECT token FROM teams WHERE teamid = \'${team}\'`);
  var qtoken = rows[0].token;
  var sql = "";

  const args = {
    token: qtoken,
    channel: channel_id,
    text:
      "Welcome to Snack Counter.\nThis apprication counts the number of times you ate.\nClick here for details.\nhttps://simacho.github.io/SnackCounter/instruction.html"
  };

  console.log(args);

  const result = await axios.post(
    `${apiUrl}/chat.postMessage`,
    qs.stringify(args)
  );
};

/* Command operate */
const commandOperate = async (user, team, rawcmd, channel_id, response_url) => {
  // get token
  var rows = await dball(`SELECT token FROM teams WHERE teamid = \'${team}\'`);
  var qtoken = rows[0].token;
  var sql = "";

  const args = {
    token: qtoken,
    // user_id: user,
    // team_id: team,
    channel: channel_id,
    text:
      "*This is Snack Counter.*\nThe following commands are available:\n\n/snackcounter log   : show your logs\n/snackcounter reset   : reset your all logs\n/snackcounter delete ID   : delete ID record\n"
  };

  var cmds = rawcmd.split(/\s/);

  switch (cmds[0]) {
    case "reset":
      sql = `DELETE FROM snacks WHERE uid = \'${user}\' AND teamid = \'${team}\'`;
      await dball(sql);
      args.text = "reset all log";
      break;
    case "delete":
      sql = `DELETE FROM snacks WHERE uid = \'${user}\' AND teamid = \'${team}\' AND rowid = \'${
        cmds[1]
      }\'`;
      await dball(sql);
      args.text = `delete id: ${cmds[1]}`;
      break;
    case "log":
      sql = `SELECT *,rowid FROM snacks WHERE uid = \'${user}\' AND teamid = \'${team}\'`;
      const rawData = await dball(sql);
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

  console.log("ARGS ", args)
  console.log("RESULT ", result.data)


};

// infomation store
const preserveToken = async body => {
  const token = {
    access_token: JSON.parse(body).access_token,
    user_id: JSON.parse(body).user_id,
    team_id: JSON.parse(body).team.id
  };

  console.log("BODY" , body)
  
  if (body) {
    dbq.serialize(() => {
      var sql = `REPLACE INTO teams(teamid,token) VALUES(\"${token.team_id}\",\"${token.access_token}\")`;
      dbq.run(sql);
    });
  }
};

module.exports = {
  displayHome,
  openModal,
  commandOperate,
  preserveToken,
  respondHomeMessage
};

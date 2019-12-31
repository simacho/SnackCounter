const axios = require("axios");
const qs = require("qs");

const JsonDB = require("node-json-db");
const db = new JsonDB(".data/preserve", true, false);

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

const addWeekBlock = (year, week, count, str) => {
  const weekOne = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${year} / ${week} week     count(s) : ${count}`
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

const updateView = async user => {
  // Intro message -

  let blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Welcome!* This is a home for a Snack counter app."
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

  // Append new data blocks after the intro -

  let newData = [];

  try {
    const rawData = db.getData(`/${user}/data/`);
    newData = rawData.slice().reverse(); // Reverse to make the latest first
    newData = newData.slice(0, 500); // Just display 20. BlockKit display has some limit.
  } catch (error) {
    //console.error(error);
  }

  if (newData) {
    let flyerBlocks = [];
    let year = 0;
    let week0 = 0;
    let str = "";
    let count = 0;

    for (const o of newData) {
      let flyer = o.flyer;
      let day = new Date(o.timestamp);
      let week1 = checkWeek(day);

      year = day.getFullYear();
      if (week0 == 0) {
        str = o.value;
        week0 = week1;
        count = 1;
        continue;
      }
      if (week0 == week1) {
        // 連結する
        str = o.value.concat(str);
        count = count + 1;
        continue;
      }

      blocks = blocks.concat(addWeekBlock(year, week0, count, str));
      str = "";
      week0 = week1;
      count = 0;
    }
    blocks = blocks.concat(addWeekBlock(year, week0, count, str));
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
};

/* Display App Home */

const displayHome = async (user, data) => {
  if (data) {
    // Store in a local DB
    db.push(`/${user}/data[]`, data, true);
  }

  const args = {
    token: process.env.SLACK_BOT_TOKEN,
    user_id: user,
    view: await updateView(user)
  };

  const result = await axios.post(
    `${apiUrl}/views.publish`,
    qs.stringify(args)
  );

  try {
    if (result.data.error) {
      console.log("ERROR!!!!!");
      console.log(result.data.error);
    }
  } catch (e) {
    console.log("CATCH!!!!!");
    console.log(e);
  }
};

/* Open a modal */

const openModal = async trigger_id => {
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

  const args = {
    token: process.env.SLACK_BOT_TOKEN,
    trigger_id: trigger_id,
    view: JSON.stringify(modal)
  };

  const result = await axios.post(`${apiUrl}/views.open`, qs.stringify(args));
};





/* Command operate */
const commandOperate = async (user, rawcmd, channel_id, response_url) => {
  const args = {
    token: process.env.SLACK_BOT_TOKEN,
    user_id: user,
    channel: channel_id,
    text: "test message sended"
  };
  
  var cmds = rawcmd.split(/\s/);
    
  switch (cmds[0]) {
    case "reset":
      db.delete(`/${user}/data/`)
      args.text = "reset all log";
      break;
    case "delete":
      db.delete(`/${user}/data[-1]`);
      args.text = "delete last count";
      break;
    case "log":
      const rawData = db.getData(`/${user}/data/`);
      args.text = "all snacks info\n";
      for (const o of rawData) {
        args.text = args.text.concat(`${o.timestamp} ${o.value}\n`)
        let flyer = o.flyer;
      }    
      
      break;
  }
  const result = await axios.post(
    `${apiUrl}/chat.postMessage`,
    qs.stringify(args)
  );
};

module.exports = { displayHome, openModal, commandOperate };

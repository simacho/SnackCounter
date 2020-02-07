# Snack Counter App

​
_Last updated: January, 2020_
​

---

​

## Snack Counter App

This app count of snacking by week.  
このアプリは週毎のお菓子を食べた回数を数えるアプリです

<!--
<a href="https://slack.com/oauth/authorize?scope=incoming-webhook,commands&client_id=647780859171.854718564373"><img alt=""Add to Slack"" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>
-->

​

### Usage (Snack Counter Home)

You click "Snack" button when you snack.
App shows counts of snacking by week.  
食べたときに"Snack"ボタンを押してください。
Home 画面に食べた回数が表示されます。
​

#### STEP 1

You click "Snack" button when you snack.  
食べたときに"Snack"ボタンを押してください。

![homeview](https://simacho.github.io/SnackCounter/inst00.jpg)<!--

#### STEP 2

Choose kind of snacks you ate.  
アイコンを選択してください。

![homeview](https://simacho.github.io/SnackCounter/inst01.jpg)

### Usage (Slash command)

At your workspace home , You can only count up.
Slash command provide below some functions.  
ホーム画面では数えるだけですが、Slash command を利用して以下の機能を使うことができます。
​

- /snackcounter delete (id)
  ​
  delete a log specified by id.  
  指定したIDの項目を削除します。
   
  ​
- /snackcounter log
  ​
  show snack log with id.  
  すべての記録を表示します。
​
- /snackcounter reset
  ​
  reset all logs.  
  全てのログを消去します。
  ​

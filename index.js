/* 
 * Snack Counter
 * December 11, 2019
 *
 */

const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const axios = require('axios'); 
const qs = require('qs');

const signature = require('./verifySignature');
const appHome = require('./appHome');

const app = express();

const apiUrl = 'https://slack.com/api';

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 *
 * Forget this if you're using Bolt framework or either SDK, otherwise you need to implement this by yourself to verify signature!
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.use(express.static(__dirname + '/public'));

/*
 * Endpoint to receive events from Events API.
 */

app.post('/slack/events', async(req, res) => {
  switch (req.body.type) {
      
    case 'url_verification': {
      // verify Events API endpoint by returning challenge if present
      res.send({ challenge: req.body.challenge });
      break;
    }
      
    case 'event_callback': {
      // Verify the signing secret
      if (!signature.isVerified(req)) {
        res.sendStatus(404);
        return;
      } 
      
      // Request is verified --
      else {
        
        const {type, user, channel, tab, text, subtype} = req.body.event;

        // Triggered when the App Home is opened by a user
        if(type === 'app_home_opened') {
          // Display App Home
          appHome.displayHome(user);
        }
      }
      break;
    }
    default: { res.sendStatus(404); }
  }
});



/*
 * Endpoint to receive an button action from App Home UI "Snack!!"
 */

app.post('/slack/actions', async(req, res) => {
  // console.log(JSON.parse(req.body.payload));
  const { token, trigger_id, user, actions, type } = JSON.parse(req.body.payload);
 
  // Button with "add_" action_id clicked --
  if(actions && actions[0].action_id.match(/add_/)) {
    // Open a modal window with forms to be submitted by a user
    appHome.openModal(trigger_id,user.id);
  } 
  
  // Modal forms submitted --
  else if(type === 'view_submission') {
    res.send(''); // Make sure to respond to the server to avoid an error
    
    const ts = new Date();
    console.log(ts)
    console.log(ts.getHours() , ts.getUTCHours())
    
    
    const { user, view } = JSON.parse(req.body.payload);
        
    const data = {
      timestamp: ts.toLocaleString(),
      value: view.state.values.flyer.snack.selected_option.value
    }
    
    console.log(data.timestamp)
    
    
    appHome.displayHome(user.id, data);
  }
});

/*
 * Endpoint to slack command
 */
app.post('/slack/commands', async(req,res) => {

  // console.log(req.body );  
  //  call slash command
  appHome.commandOperate( req.body.user_id , req.body.text , req.body.channel_id , req.body.response_url )
  res.send();
  
});

/*
 * Endpoint to oauth
 */
app.get('/slack/oauth', async(req,res) => {

  if (!req.query.code) { // access denied
    console.log('Access denied');
    return;
  }
  var data = {form: {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: req.query.code
  }};
  
  console.log(data)
  
  request.post(apiUrl + '/oauth.access', data, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      
      // Get an auth token (and store the team_id / token)    
      appHome.preserveToken(body)

      
      res.sendFile(__dirname + '/public/success.html');
    }
  })
});


/* Running Express server */
const server = app.listen(5000, () => {
  console.log('Express web server is running on port %d in %s mode', server.address().port, app.settings.env);
});


app.get('/', async(req, res) => {
  res.send('There is no web UI for this code sample. To view the source code, click "View Source"');
});

require("dotenv").config();
const axios = require("axios");
const { log } = require("console");
const fs = require("fs");
const parse = require("parse-link-header");

var environment = process.argv[2];
console.log("Selected Carrier Okta environment: " + environment);
var app_list = fs.createWriteStream(
  __dirname + `/${environment}_GroupList.csv`,
  { flags: "w" }
);
app_list.write("App_id, Group_id\n");
var org_url = "";
var base_url = "";
var api_token = "";
const path = require("path");
const csv = require("csv-parser");

const filePath = path.join(__dirname, "carrier-dev_appList.csv");
var App_IDs = [];
fs.createReadStream(filePath)
  .pipe(csv())
  .on("data", async (row) => {
    // console.log(row.id);
    await App_IDs.push(row.id);
  })
  .on("end", () => {
    // console.log(App_IDs);
    processAppIds(App_IDs);
    console.log("CSV file successfully processed.");
  });
  async function processAppIds(App_IDs) {
    
    const appData = {}; // Initialize an empty object to accumulate data

    for (const appId of App_IDs) {
      const data = await app_list_generator(appId);
      if (data) {
       console.log('addd');
        Object.assign(appData, data); // Merge data into the appData object
      }
    }
  
    // Write the entire appData object to a JSON file
    const jsonData = JSON.stringify(appData, null, 2);
    const filePath = 'carrier-dev_GroupList.json';
  
    fs.writeFile(filePath, jsonData, (err) => {
      if (err) {
        console.error('Error writing JSON file:', err);
      } else {
        console.log('JSON file created successfully!');
      }
    });
  }
if (environment) {
  if (environment == "carrier-dev") {
    console.log("Fetching applications from Carrier Dev Workforce Tenant");
    org_url = process.env.carrier_dev_org_url;
    base_url = process.env.carrier_dev_org_base;
    api_token = process.env.carrier_dev_api_token;
  } else {
    console.log("Fetching applications from Carrier Prod Workforce Tenant");
    // https://desktop.postman.com/?desktopVersion=10.16.0&userId=11553625&teamId=1080120
    org_url = process.env.carrier_prod_org_url;
    base_url = process.env.carrier_prod_org_base;
    api_token = process.env.carrier_prod_api_token;
  }
}

var isPaused = false;


const app_list_generator = async (appId) => {
    const maxRetries = 10;
    const retryInterval = 1000; // 1 second (adjust as needed)
  
    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
      try {
        const config = {
          method: 'get',
          url: `https://${org_url}.${base_url}/api/v1/apps/${appId}/groups`,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `SSWS ${api_token}`
          }
        };
  
        const response = await axios.request(config);
        let g_ids = [];
  
        if (response.data.length >= 1) {
          for (let i = 0; i < response.data.length; i++) {
            g_ids.push(response.data[i].id);
          }
  
          return {
            [appId]: g_ids
          };
        } else {
          return null;
        }
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.log('Too Many Requests. Retrying...');
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        } else {
          console.error(`Error processing appId ${appId}: ${error.message}`);
          return null;
        }
      }
    }
  
    console.error(`Max retries reached for appId ${appId}. Unable to make the request.`);
    return null;
  };
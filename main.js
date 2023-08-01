require('dotenv').config();
const axios = require('axios');
const { log } = require('console');
const fs = require('fs');
const parse = require('parse-link-header');
var environment = process.argv[2];
console.log("Selected Carrier Okta environment: "+environment)
var app_list = fs.createWriteStream(__dirname+`/${environment}_appList.csv`,{flags: 'w'});
app_list.write("id, label, app_type, name\n");
var org_url = "";
var base_url = "";
var api_token = "";

if(environment){
    
    if(environment=="carrier-dev"){
        console.log("Fetching applications from Carrier Dev Workforce Tenant")
        org_url = process.env.carrier_dev_org_url;
        base_url = process.env.carrier_dev_org_base;
        api_token = process.env.carrier_dev_api_token;
    }else{
        console.log("Fetching applications from Carrier Prod Workforce Tenant")
       // https://desktop.postman.com/?desktopVersion=10.16.0&userId=11553625&teamId=1080120
        org_url = process.env.carrier_prod_org_url;
        base_url = process.env.carrier_prod_org_base;
        api_token = process.env.carrier_prod_api_token;
    }
}


var isPaused = false;
//

let app_list_generator = (next_url) => {
    // configure axios to retrieve app list
   // console.log(process.env.carrier_dev_org_url);
  
    let config = {
        method: 'get',
        url: next_url ? next_url : `https://${org_url}.${base_url}/api/v1/apps?limit=250`,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `SSWS ${api_token}`
        }
    };
    //Request app list from Okta using Axios
    axios.request(config)
        .then((response) => {
            isPaused = true;
            console.log(response.data.length);
            if(response.data.length>=1){
                for(let i=0; i< response.data.length;i++){
                    let current_app = {
                        id: response.data[i].id,
                        label: response.data[i].label,
                        app_type: response.data[i].signOnMode,
                        name: response.data[i].name
                    }
                    app_list.write(`${current_app.id},${current_app.label},${current_app.app_type},${current_app.name},${JSON.stringify(response.data[i])}\n`);
                }
            }
            var link_headers = parse(response.headers.link)
            if(link_headers.next!=null){
                console.log("--Looping--")
                console.log("Found Next URL: "+link_headers.next.url)
                var next_url = link_headers.next.url;
                app_list_generator(next_url)
            }
            isPaused = false;
        })
        .catch((error) => {
            console.log(error);
        })
};
app_list_generator();
/*
* Mines the NPM registry.
* Total size is so big, I can't feasibly even upload online, so this handles the filtering on demand.
* We only save registry entries with github repositories, significantly reducing size. 
*
* Uses paginated https://replicate.npmjs.com/_all_docs?include_docs=true endpoint.
*
* Run:
*    `node scripts/mine-registry.js`
*/

import axios from "axios";
import fs from "fs";
import StreamObject from "stream-json/streamers/StreamObject.js";
import {
  createReadStream,
  createWriteStream,
} from 'fs';
import process from 'process';
import { pipeline } from 'stream';

const registry_path = "registry.json";
const API = "https://replicate.npmjs.com/_all_docs?include_docs=true";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function downloadFileStream(url){
  return new Promise(async (resolve, reject) => {
    try{
      var response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      })

      var parser = StreamObject.withParser()
      var stream = response.data.pipe(parser)
      const result = {};

      stream.on('data', (chunk) => {
        result[chunk['key']] = chunk['value'];
        // Object.assign(result, chunk);
      });

      stream.on('end', () => {
        // console.log('end')
        resolve(result); // Resolve with the parsed data
      });

      stream.on('error', (err) => {
        console.log(err)
        reject(err); // Reject on any error
      });
    } catch(e){
      console.log(e)
      reject(e); // Reject if the axios request fails
    }
  });
}

/**
 * Handle downloading files.
 * @param {*} url 
 * @returns 
 */
async function downloadFile(url){
  try{
  //   var file = await axios.get(url, {headers: { 
  //     maxContentLength: Infinity,
  //     maxBodyLength: Infinity,
  //     responseType: 'json'
  //   }});
  //   return file['data'];
    var file = await downloadFileStream(url);
    return file;
  }catch(e){
    console.log(e)
    if(e['response']['status'] == 502){
      await delay(30000)
      var response = await downloadFile(url);
      return response;
    }
    return undefined;
  }
}


/**
 * Filter for packages that have a github repository only.
 * https://docs.npmjs.com/cli/v11/configuring-npm/package-json#repository
 */
function has_github(data){
  //if no repo field
  if(data['repository'] == undefined) return false;
  //handle string case
  if(typeof data['repository'] == 'string'){
      if(!data['repository'].includes('github')) return false;
  }
  //handle object case
  else{
      var url = data['repository']['url'];
      if(!url) return false;
      if(typeof url != 'string') return false;
      if(!url.includes('github')) return false;
  }
  return true
}

/**
 * Stream paginated data to a file.
 * https://docs.couchdb.org/en/stable/ddocs/views/pagination.html
 */
async function mine(){
    // if(!fs.existsSync(registry_path)) fs.writeFileSync(registry_path, "[", 'utf8');
    var limit = 100; //if file size is too large, the download will fail
    var start_key = undefined;
    // var start_key = "\"" + "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" + "\"";
    var rows = undefined;
    var page = 0;
    var done = false;
    while(!done){
        page++;

        //format url
        var URL = API + "&limit=" + (limit + 1);
        if(start_key) URL += "&startkey=" + start_key;

        //get the page
        console.log("Page: " + page + ", Total Rows: " + rows, ", URL: " + URL)
        var response = await downloadFile(URL);
        if(!response){
            console.log("Failed to download registry data.")
            break;
        }
        rows = response['total_rows'];
        start_key = "\"" + response['rows'][response['rows'].length - 1]['id'] + "\"";

        var data = response["rows"];
        if(data.length <= limit) done = true;
        for(var i=0; i<data.length-1; i++){
            var r = data[i];
            var doc = r['doc'];
            if(has_github(doc) == false) continue;
            fs.appendFileSync(registry_path, JSON.stringify(doc) + ",", 'utf8');
        }
    }
    fs.truncateSync(registry_path, fs.statSync(registry_path).size - 1)
    fs.appendFileSync(registry_path, "]", "utf8")
}

/**
 * Script to zip the file.
 */
function zip(){
    const gzip = createGzip();
    const source = createReadStream('registry.json');
    const destination = createWriteStream('registry.json.gz');

    pipeline(source, gzip, destination, (err) => {
    if (err) {
        console.error('An error occurred:', err);
        process.exitCode = 1;
    }
    });
}

/**
 * Script to check the end of the file.
 */
function checkFileEnd(){
    var span = 10000;
    fs.open(registry_path, 'r', (e, fd) => {
        fs.read(fd, new Buffer(span), 0, span, fs.statSync(registry_path).size - span, (e, b, buffer) => {
            console.log(buffer.toString('utf8'));
        })
    })
}

mine();
//zip();
//checkFileEnd();
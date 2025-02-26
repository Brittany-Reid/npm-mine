/**
 * Example of how to read data from the registry.
 */
import fs from 'fs';
import StreamArray from "stream-json/streamers/StreamArray.js"

const registry_path = "registry.json";


async function read() {
    return new Promise((resolve, reject) => {
        var pipeline = fs.createReadStream(registry_path,  {encoding: 'utf8'});
        pipeline = pipeline.pipe(StreamArray.withParser())
        var n = 0;

        pipeline.on('data', data => {
            n++;
            data = data['value'];
            if(n == 1){
                console.log(data);
            }
        })

        pipeline.on('end', ()=>{
            console.log("Total Entries: " + n)
            resolve();
        })
    })
}

async function main(){
    await read();
}

main()
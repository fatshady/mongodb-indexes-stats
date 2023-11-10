const fs = require('fs');
var execSync = require('child_process').execSync;

const collection_name = process.argv[2];

const srv_connection_string = process.argv[3];

//Extract connection String info
const captureGroups = /mongodb\+srv:\/\/(.*?):(.*?)@(.*?)\.(.*?)\.(.*)\/(.*)/.exec(srv_connection_string);

const user = captureGroups[1];
const pass = captureGroups[2];
const clusterName = captureGroups[3];
const clusterAtlasProgressive = captureGroups[4];
const cluterDomain = captureGroups[5];
const dbName = captureGroups[6];
const hostName = `${clusterName}-${clusterAtlasProgressive}.${cluterDomain}`;

console.log("CLUSTER NAME : " + clusterName);
console.log("CLUSTER PORGRESSIVE : " + clusterAtlasProgressive);
console.log("CLUSTER DOMAIN : " + cluterDomain);
console.log("DB NAME : " + dbName);

const srv_prefix = '_mongodb._tcp.';

//Resolve SRV dns
var nsCommand = `nslookup -q=SRV ${srv_prefix}${hostName}`;
console.log(nsCommand);
var nslookupOutput = execSync(nsCommand).toString();
console.log("\n" + nslookupOutput);


var rawReplicaList = nslookupOutput
    .split('\n')
    .filter(line => line.includes(hostName));

var replicaExtractRegex = new RegExp(`((${clusterName}-shard)(.*))\.`);
var replicas = rawReplicaList.map(rawReplica => replicaExtractRegex.exec(rawReplica)[1]).sort();

console.log("Found replicas: ");
console.log(`${JSON.stringify(replicas,null,'\t')}`);

//Get info foreach replica
var replicasJsonResponses = replicas.map(function(replica) {
    console.log(`${replica} Extracting ...`);
    var replicaResponse = execSync(`mongosh --quiet "mongodb://${user}:${pass}@${replica}/${dbName}?readPreference=secondaryPreferred" --authenticationDatabase admin -tls --eval 'EJSON.stringify(db.invoices.aggregate( [ { $indexStats: { } }, {$limit: 100} ] ).toArray());'`).toString();
    console.log(`Done!`);
    //Return object with replicaname and collected json
    return JSON.parse(`{"${replica}":${replicaResponse}}`);

})

var returnObj = {};
returnObj.extractionDate = Date.now();
returnObj.replicasInfo = replicasJsonResponses;

//Save results to file
var fileName = `index_stats_${getDateTime()}.txt`;
console.log(`Writing output to ${fileName}`);
fs.writeFileSync(fileName, JSON.stringify(returnObj));


function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + "_" + hour + ":" + min + ":" + sec;

}

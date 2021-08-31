const fs = require('fs');
var execSync = require('child_process').execSync;

const collection_name = process.argv[2];

const srv_connection_string = process.argv[3];	


//Extract connection String info
const captureGroups = /mongodb\+srv:\/\/(.*?):(.*?)@(.*)-(.*?)\.(.*)\/(.*?)\?/.exec(srv_connection_string);

const user = captureGroups[1];
const pass = captureGroups[2];
const clusterName = captureGroups[3];
const clusterAtlasProgressive = captureGroups[4];
const cluterDomain = captureGroups[5];
const dbName = captureGroups[6];
const hostName = `${clusterName}-${clusterAtlasProgressive}.${cluterDomain}`;

const srv_prefix = '_mongodb._tcp.';

//Resolve SRV dns
var nslookupOutput = execSync(`nslookup -q=SRV ${srv_prefix}${hostName}`).toString();

var rawReplicaList = nslookupOutput
    	.split('\n')
  		.filter(line => line.includes(hostName));

var replicaExtractRegex = new RegExp(`((${clusterName}-shard)(.*))\.`);
var replicas = rawReplicaList.map(rawReplica => replicaExtractRegex.exec(rawReplica)[1]).sort();

console.log("Found replicas: ");
console.log(`${JSON.stringify(replicas,null,'\t')}`);

//Get info foreach replica
var replicasJsonResponses = replicas.map(function(replica) {
  console.log(`Extracting index info from replica: ${replica}`);
  var replicaResponse = execSync(`echo 'rs.slaveOk();
db.${collection_name}.aggregate( [ { $indexStats: { } }, {$limit: 120} ] ).toArray();' | mongo "mongodb://${user}:${pass}@${replica}/${dbName}?authSource=admin" -ssl`).toString();
  var reg = new RegExp('MongoDB server version.*\n((?:.*\r?\n?)*)bye');
  //Remove useless output
  var plainResponse = reg.exec(replicaResponse)[1];
  //Convert response output to valid json by replacing Mongo number and Date syntax
  var plainResponseJson = plainResponse.replace(/NumberLong\((.*)\)/g, function(a, b){
    return b;
  }).replace(/ISODate\(\"(.*)\"\)/g, function(a, b){
    return `"${b}"`;
  });

console.log(`Done`);
//Return object with replicaname and collected json
return JSON.parse(`{"${replica}":${plainResponseJson}}`);
 
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

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + "_" + hour + ":" + min + ":" + sec;

}

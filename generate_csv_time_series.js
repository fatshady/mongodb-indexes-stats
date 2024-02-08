//this script parse all extracted files and outputs a cvs file with usage stats foreach index

const folder = './';
const fs = require('fs');

var averageReplicaIndex = false;
const mode = process.argv[2];
const outFileName = process.argv[3];

if (mode == 'average') {
    averageReplicaIndex = true;
}

var maxNOfReplicas = 0;
var data = {};
fs.readdirSync(folder).forEach(file => {
    if (file.startsWith("index_stats")) {
        try {
            var json = JSON.parse(fs.readFileSync(file));
        } catch (e) {
            console.log(`\nError parsing file ${file} \n`)
            console.log(e);
            console.log(`\nFile SKIPPED \n`)
            return;
        }

        var extractionDate = json.extractionDate;
        data[extractionDate] = {};
        var nOfReplicas = json.replicasInfo.length;
        if (nOfReplicas > maxNOfReplicas) {
            maxNOfReplicas = nOfReplicas;
        }
        json.replicasInfo.map(replica => {
            var replicaName = Object.keys(replica).sort()[0];
            replica[replicaName].map(index => {

                if (averageReplicaIndex) {
                    var value = data[extractionDate][`${index.name}`];
                    if (value == null) {
                        var ops = index.accesses.ops;
                        var since = getSince(index);
                        var mins = (extractionDate - since.getTime()) / 1000 / 60; //per min
                        var timesPerMin = (ops / mins);
                        data[extractionDate][`${index.name}`] = timesPerMin;
                    } else {
                        var ops = index.accesses.ops;
                        var since = getSince(index);
                        var mins = (extractionDate - since.getTime()) / 1000 / 60; //per min
                        var timesPerMin = (ops / mins);
                        value = (value + timesPerMin);
                        data[extractionDate][`${index.name}`] = value;
                    }
                } else {
                    var ops = index.accesses.ops;
                    
                    var mins = (extractionDate - since.getTime()) / 1000 / 60; //per min
                    var timesPerMin = (ops / mins);
                    data[extractionDate][`${replicaName}_${index.name}`] = timesPerMin;
                }
            })
        });

    }
});

//Define csv header
var header = "date,";
Object.keys(data[Object.keys(data).sort()[0]]).sort().forEach(replicaIndex => header = header + replicaIndex + ",")


if (averageReplicaIndex) {
    console.log(`Results is the average of the ${maxNOfReplicas} replicas`);
} else {
    console.log(`Results are unique foreach replica`);
}

console.log(`Writing output to ${outFileName}`);

var fileWriter = fs.createWriteStream(outFileName, {
    flags: 'w'
})

fileWriter.write(`${header}\n`);
Object.keys(data).forEach(extractionDate => {
    var d = new Date(parseInt(extractionDate));
    var line = `${d.toISOString()},`;
    Object.keys(data[extractionDate]).sort().forEach(replicaIndex => {
        if (averageReplicaIndex) {
            //divide by number of replicas
            line = line + (data[extractionDate][replicaIndex] / maxNOfReplicas).toFixed(2).toString() + ","
        } else {
            line = line + (data[extractionDate][replicaIndex] / 1).toFixed(2).toString() + ","
        }

    }) //
    fileWriter.write(`${line}\n`);
})

function getSince(index) {
    var since = null;
    if (index.accesses.since.$date === null || index.accesses.since.$date === undefined) {
        if (index.accesses.since === null || index.accesses.since === undefined) {
            console.log(`Can't read "since" from ${index}`);
        }
        //old versions generates without
        since = new Date(`${index.accesses.since}`);
    } else {

        since = new Date(`${index.accesses.since.$date}`);
    }
    return since;
}

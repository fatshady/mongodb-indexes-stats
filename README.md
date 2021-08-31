# MongoDb Indexes Usage Stats

This scripts aims to extract the index stat information for each replica in a MongoDb cluster and 
convert it in a time series that is written in a csv file intended to be plotted on a graph.

The code has been written due to personal needs and is provided "as is" in a spirt of mutual sharing.

## Prerequisites
- SRV MongoDb Atlas connection string
- Mongo shell binary installed
- Needs an admin user

## The 2 scripts

The process of getting the stats is splitted in 2 phases. Collect and Parse

### Collecting
This script should be run periodically to sample the index usage across time.
One typical use-case could be start capturing samples before ad index creation, then create the new index 
intended to replace the provious less performant one and then stop capturing the stats a few days later.
Plotting the generated timeseries inside the csv should show a decrease of use of the oldest index and an
increas of the newly created one.

To run the script just call the script and provide the collection name along with a SRV connection string:
```sh
node collect_indexes_stats_snapshot.js {collection} {srv-string}
node collect_indexes_stats_snapshot.js my-collection "mongodb+srv://admin-user:pass@my-cluster-uxx3r.mongodb.net/my-db
```
each run produces a file containing the stats of all the found indexes, the file is named with the date of exctraction that is needed fot the parsing phase.

### Parsing
This script looks in its folder for all the files names that stars with "index_stats" and produces a csv input containing a time series.
It can be run every time you get a new stats file. (The output file will be owerwritten)

Since the index stats provided by the replicas are in the following format: 
```
"accesses": {
    "ops": 14436,
    "since": "2021-05-15T23:08:01.144Z"
},
```
We need to convert them in a more redeable format by converting it into "times per minute"
this step is made by calling the analyzeIndexFiles.js script.
```sh
node generate_csv_time_series.js {mode} {outputfile}
```
It can be run in two ways:

- Average mode (Easy way) : the result will be an average usage for each index across all replicas
```sh
node generate_csv_time_series.js average stats.csv
```
- Plain mode (More complex to read): Each replica has its unique results (useful for people splitting workload using ReadOnly nodes or Analytics nodes). all the index names are prefixed with the replica name.
```sh
node generate_csv_time_series.js plain stats.csv
```
## Plotting Graphs

No graph utility is provided with this code. 
You can use a simple GDrive Spreadsheet to draw the graph
Ore use one of the online Csv plot tools
i used the following tool ad works just fine the the Date and Number format used. (Iso dates and . as decimal separator)

https://chart-studio.plotly.com/create/#/ 
(If you are the owner of the service and don't want me to link you as an example please contact me and i will remove the link immediately)

## Tested with
- Node v14.5.0
- MongoDb 4.2.15 (Hosted on Atlas)
- MacOs Catalina 10.15.6

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. 

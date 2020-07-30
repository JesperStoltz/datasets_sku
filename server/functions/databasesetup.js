const fs = require('fs');

module.exports = setup = {

    getCSV: async () => {
    //Returns array
    return await new Promise((resolve, reject) => {
        fs.readFile("../data/price_detail.csv", 'utf8', function (err, data) {
            let dataArray = [];
            let dataObject = {};

            //Object keys setup
            let keys = data.split(/\n/).splice(0, 1);
            keys = keys[0].split("\t"); //Split on tab
            keys[keys.length - 1] = keys[keys.length - 1].split("\r").shift(); //Remove 'new row' indication from last element.

            for (let key of keys) {
                const keyObject = { [key]: null };
                dataObject = { ...dataObject, ...keyObject };
            }

            const rows = data.split(/\n/).slice(1);
            let i = 0;
            rows.forEach(row => {
                const column = row.split("\t");
                for (let key in dataObject) {
                    if (i === column.length - 1) {
                        const removedRowBreak = column[i].split("\r").shift();
                        dataObject[key] = removedRowBreak;
                    }
                    else {
                        dataObject[key] = column[i];
                    }

                    if (dataObject[key] === "NULL") {
                        dataObject[key] = null;
                    }
                    else {
                        if (key === "Created") {
                            dataObject[key] = new Date(dataObject[key])
                        }
                        else if (key === "Modified") {
                            dataObject[key] = new Date(dataObject[key])
                        }
                        else if (key === "ValidFrom") {
                            dataObject[key] = new Date(dataObject[key])
                        }
                        else if (key === "ValidUntil") {
                            dataObject[key] = new Date(dataObject[key])
                        }
                        else if (key === "UnitPrice") {
                            dataObject[key] = parseFloat(dataObject[key]);
                        }
                    }
                    i++;
                }
                dataArray.push(dataObject);

                for (let key of keys) {
                    const keyObject = { [key]: null };
                    dataObject = { ...dataObject, ...keyObject };
                }
                i = 0;
            });
            resolve(dataArray);
            console.log(dataArray)
        });
    });
    }, //End of getCSV()

    addArrayToDB: async (arrayFunc) => {
        let array = await arrayFunc();
        let i = 0;
        const db = await new Datastore({ filename: "../database/" + array[i].CatalogEntryCode + ".db", inMemoryOnly: false, autoload: true });
        await new Promise((resolve, reject) => {
            db.insert(array[i], function (err, addedDocs) {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                else {
                    console.log("Added to " + array[i].CatalogEntryCode)
                    i++;
                    resolve(addedDocs)
                }
            });
        });
    }, //End of addArrayToDB
}
const fs = require('fs')
const xlsx = require('node-xlsx')
const ndjson = require('ndjson')
const moment = require('moment')
const fn = async () => {
    const txt = await readFile()

    const request = txt
    .filter(el => {
        const testRegex = /API-DPLUSWEPLUS\|(\w+)\|.*\/(.*)/gi.test(el.log)
        return testRegex
    })
        .map((el) => {
            const [_, reqID, route] = /API-DPLUSWEPLUS\|(\w+)\|.*\/(.*)/gi.exec(el.log)
          //  console.log('el.time', el.time)
            return {
                reqID,
                route,
                datetime:el.time
            }
        })
    // console.log('request', request)
    const setOfRequestID = new Set(request.map(el => el.reqID))

    const response = txt.reduce((prev, cur) => {
        const testRegexResponse = /API-DPLUSWEPLUS\|(\w+)\|.*status_code\: (\d+).*time used: (.*) ms/gi.test(cur.log)
        if (testRegexResponse) {
            const [_, reqID, statusCode, time] = /API-DPLUSWEPLUS\|(\w+)\|.*status_code\: (\d+).*time used: (.*) ms/gi.exec(cur.log)
            if (setOfRequestID.has(reqID)) {
                return [
                    ...prev,
                    {
                        reqID,
                        statusCode: +statusCode,
                        time: +time,
                        datetime:cur.time
                    }]
            }
        }
        return prev
    }, [])

    const funcLogTime = txt.reduce((prev, cur) => {
        const testRegexFunctionLogTime = /(.*) : (.*): (.*)ms/gi.test(cur.log)
        if (testRegexFunctionLogTime) {
            const [_, funcName, reqID, time] = /(.*) : (.*): (.*)ms/gi.exec(cur.log)
            if (setOfRequestID.has(reqID)) {
                return [
                    ...prev,
                    {
                        funcName,
                        reqID,
                        time: +time,
                        datetime:cur.time
                    }]
            }
        }
        return prev
    }, [])

    // console.log('request', request)
    // console.log('response', response)
    // console.log('funcLogTime', funcLogTime)
    const buffer = xlsx.build([
        { name: 'request', data: [["reqID", "route","datetime"]].concat(request.map(el => ([el.reqID, el.route,el.datetime]))) },
        { name: 'response', data: [["reqID", "statusCode", "time","datetime"]].concat(response.map(el => ([el.reqID, el.statusCode, el.time,el.datetime]))) },
        { name: 'funcLogTime', data: [["reqID", "funcName", "time","datetime"]].concat(funcLogTime.map(el => ([el.reqID, el.funcName, el.time,el.datetime]))) },
    ]);

    fs.writeFileSync('logData.xlsx', buffer, 'utf-8')
}
const readFile = async()=>{
    return new Promise((resolve,reject)=>{
        let txt = []
        fs.createReadStream('lastlog.log')
        .pipe(ndjson.parse())
        .on('data', function (obj) {
            txt.push({log:obj.log,time:moment(obj.time).format('YYYY-MM-DD HH:mm:ss')})
           
        })
        .on('end',()=>resolve(txt))
    })
    
}



fn()
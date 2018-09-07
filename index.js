const MYSQL_HOST = "allticket.ct7jgifa0ahl.ap-southeast-1.rds.amazonaws.com";
const MYSQL_DATABASE = "allticket";
const MYSQL_USER = "ticketlambda";
const MYSQL_PASSWORD = "1234";

const EXECUTEDB_FAILED_CODE = "99999";
const SUCCESS_CODE = "100";

var mysql = require('mysql');

exports.handler = (param, context, callback) => {
    console.log("param : " + param);

    // const done = (errCode, result, data) => callback(null, {
    //     statusCode: '200',
    //     body: JSON.stringify(
    //         {
    //             success:errCode?false:true,
    //             code:errCode?errCode:100,
    //             message:errCode?JSON.stringify("ERROR:"+errCode+" "+result):JSON.stringify(result),
    //             data:data?data:{}
    //         }
    //     ),
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Access-Control-Allow-Origin': '*'
    //     },
    // });    
    
    const done = (errCode, result, data) => callback(null, data); 
        
    var cmdlist;
    var nCmd = 0;
    
    var errorCode="";
    var resultList = [];
    var msg;

    if(typeof param.querylist.length==="number"){
        cmdlist = param.querylist;
    } else {
        //not query array
        cmdlist = [param.querylist];
    }

    console.log("cmdlist:"+cmdlist.length);
    
    var connection = mysql.createConnection({
        host     : MYSQL_HOST,
        user     : MYSQL_USER,
        password : MYSQL_PASSWORD,
        database : MYSQL_DATABASE
    });

    connection.connect();
    console.log("autoCommit : " + param.autoCommit + " : param.autoCommit===false --> " + param.autoCommit===false)
    if(param.autoCommit===false){

        //Case : Transaction
        console.log("#### DBTransaction");
        connection.beginTransaction(function(err) {
            if (err) { throw err; }

            for(i=0; i<cmdlist.length; i++){
                console.log("### i : " + i);
                console.log("query : " + cmdlist[i].query);
                console.log("value : " + cmdlist[i].value);

                connection.query({
                    sql: cmdlist[i].query,
                    timeout: 40000,
                    values: cmdlist[i].value
                }, function (error, results, fields) {
                    nCmd = nCmd + 1;
                    console.log("###nCmd : " + nCmd);

                    console.log("result : "+ results);
                    console.log("error : " + error);

                    if (error) {
                        errorCode = EXECUTEDB_FAILED_CODE;
                        msg ="Execute Db Failed"
                        resultList.push({"result":error});
                        //Case RollBack
                    }
                    
                        console.log(errorCode);
                        console.log(errorCode==="")
    
                        if(nCmd===cmdlist.length){
                            if(errorCode===""){
                                connection.commit(function(error) {
                                    if (error) {
                                        connection.rollback(function() {
                                            console.log('### rollback2');
                                            
                                            errorCode = EXECUTEDB_FAILED_CODE;
                                            msg ="Execute Db Failed"
                                            resultList.push({"result":error});
                                            
                                            connection.end();
                                            
                                            done(errorCode, msg, resultList); //return
                                            //throw error;
                                        });
                                    } else {
        
                                        console.log('### Commit Success');
                                        connection.end();
                                        
                                        msg ="Execute Db Success"
                                        resultList.push({"result":results});
                                        
                                        done(errorCode, msg, resultList); //return
                                    }
                                });
                            } else {
                                
                                connection.rollback(function() {
                                    //resultList.push({"result":errorCode});
                                    console.log("### rollback1 Success");
                                    console.log("",resultList);
                                    connection.end();
                                    done(errorCode, msg, resultList); //return
                                });
                            }
                        }
                });
            } //end for
        }) //end beginTransaction

    } else {
        
        for(i=0; i<cmdlist.length; i++){

            console.log("query : " + cmdlist[i].query);
            console.log("value : " + cmdlist[i].value);

            connection.query({
            sql: cmdlist[i].query,
            timeout: 40000,
            values: cmdlist[i].value
            }, function (error, results, fields) {
                nCmd = nCmd + 1;
                console.log(i + "###results : " + results);
                console.log("###nCmd : " + nCmd);
                
                if (error) {
                    //throw error;
                    errorCode = EXECUTEDB_FAILED_CODE;
                    msg ="Execute Db Failed"
                    resultList.push({"result":error});
                } else {
                    msg ="Execute Db Success"
                    resultList.push({"result":results});
                }

                if(nCmd===cmdlist.length){
                    connection.end();
                    console.log("#### resultList : " + JSON.stringify(resultList));
                    done(errorCode, msg, resultList); //return
                }

            });
        } //end for
    
    } //end if

};



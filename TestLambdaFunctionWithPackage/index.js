'use strict' ;
const   AWS = require('aws-sdk') ,
        Lambda = new AWS.Lambda({ apiVersion: '2015-03-31' }) ,
        { paymentInvoice , paymentInvoiceNationalPark } = require('./invoice_module') ,
        ReserveDetailModule = require( "./ReserveDetailModule" ) ,
        LAMBDA_GET_RESERVE_DETAIL = 'GETReserve_Detail_Function' ,
        ERROR_CODE_NO_RESERVE_DETAIL = "72111" ;
        
const invokeLambdaPromise  = ( lambdaName , invokeType , paramsObject ) => {
    const params = {
       FunctionName : lambdaName ,
       InvocationType : invokeType ,
       Payload : new Buffer( JSON.stringify( paramsObject ) , 'utf8' ) 
    } ;
    console.log( '>>> Lambda params :: %s ' , JSON.stringify(params) ) ;
    return new Promise( ( resolve , reject ) => {
        Lambda.invoke( params , ( err , data ) => {
            if( err ) return reject( err ) ;
            let payload =  {};
            try{
                payload = ( data.Payload ) ?JSON.parse(data.Payload):{} ;
                console.log( '>>> Payload :: %s ' , JSON.stringify(payload) ); 
                return resolve( payload ) ;
            }catch(e){
                console.error(e) ;
                return reject(data);
            }
            
        }) ;
    }) ;
} ;


exports.handler = async ( event , context , callback ) => {
    // TODO implement
    const RESP = {
        getResponse( _code , _message , _data ) {
            return {
                statusCode : 200 ,
                body : JSON.stringify({
                    success : (_code == 100) ?true : false,
                    code : _code ,
                    message : _message ,
                    data : (_data) ? _data : {}
                }),
                headers : {
                    'Access-Control-Allow-Origin' : '*',
                    'Content-Type' : 'application/json'
                }
            }
        }  
    }
    console.log('>>> Event :: %s ' , JSON.stringify(event) ) ;
    
    let params = {} ,
        resp_get_reserve = {} ,
        payment_invoice  = {} ,
        reserveDetail = {} ;
        
    if( event.body ){
        params = JSON.parse(event.body) ;
        console.log('>>> Params :: %s ' , JSON.stringify(params) ) ;
    }
    
    try{
        reserveDetail = new ReserveDetailModule( params.reserveId ) ;
        resp_get_reserve = await reserveDetail.doGetReserveDetail() ;
        console.log( 'RESERVE DETAIL :: %s' , JSON.stringify(resp_get_reserve)) ;
        if( resp_get_reserve == null ){
            callback( null , RESP.getResponse( ERROR_CODE_NO_RESERVE_DETAIL , 'Reserve detail not found!' , null)) ;
        }
        
        let performSubType = (resp_get_reserve.reserveRequestTo && resp_get_reserve.reserveRequestTo.performSubType ) ? 
                                resp_get_reserve.reserveRequestTo.performSubType : '' ;
        if( performSubType == 'NATIONALPARK' ){
            payment_invoice = paymentInvoiceNationalPark( resp_get_reserve ) ;
        }else if( performSubType == 'BUS' ){
            payment_invoice = {} ;
        }else{
            payment_invoice = paymentInvoice( resp_get_reserve ) ;   
        }
        callback( null , RESP.getResponse( 100 , 'success' , {payment_invoice : payment_invoice })) ;
        
    }catch(e){
        console.error(e) ;
        callback( null , RESP.getResponse( 77777 , e.message , e ) ) ;
    }
} ;
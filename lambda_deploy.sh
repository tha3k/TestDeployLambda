#!/bin/bash

REGION=ap-southeast-1
ROLE=arn:aws:iam::229056414901:role/service-role/AllMapLambdaRole

for lambda_name in `find . -maxdepth 1 -mindepth 1 -type d -printf '%f\n'`
do
    echo "+ make package for lambda function" [$lambda_name]
	cd $lambda_name
	
	if [ -e package.json ]
	then
		echo "- Found package.json => install.."
		npm install	
	else
		echo "- Not found package.json => Do nothing"
	fi
	
	echo "- make zip file.. "
	zip lambda.zip *  -r -x .git/\* \*.sh \*.yml tests/\* node_modules/aws-sdk/\* \*.zip

	echo "- deploy lambda function .. "
	aws lambda get-function --region $REGION --function-name $lambda_name 
	if [ $? -eq 0 ]; 
	then
		echo "- already have lambda function "[$lambda_name]" => do update.."
		aws lambda update-function-code  --publish --region $REGION --function-name $lambda_name --zip-file fileb://lambda.zip
	else
		echo "- create new lambda function "[$lambda_name]
		aws lambda create-function --region $REGION --function-name $lambda_name --zip-file fileb://lambda.zip --role $ROLE --handler index.handler --runtime nodejs6.10 --memory-size 128 --timeout 10
	fi
	
	cd ..
	echo ""
	
done

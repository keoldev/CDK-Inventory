import { RemovalPolicy, Stack, StackProps, Aws } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3' 
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb'
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { AccountRecovery } from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { WafwebaclToCloudFront } from "@aws-solutions-constructs/aws-wafwebacl-cloudfront"
import { WafwebaclToApiGateway } from "@aws-solutions-constructs/aws-wafwebacl-apigateway";
import { wafWebACLApigatewayProps } from './waf-apigateway'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const frontCloudfront = new CloudFrontToS3(this, 'front-cloudfront', {
      insertHttpSecurityHeaders: false,
      bucketProps: {
        bucketName: 'frontend-inventory-bucket',
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true
      },
      cloudFrontLoggingBucketProps: {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      },
      loggingBucketProps: {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    })

    const wafFrontCloudFront = new WafwebaclToCloudFront(this, 'wafwebacl-front-cloudfront', {
      existingCloudFrontWebDistribution: frontCloudfront.cloudFrontWebDistribution
    });

    const imageCloudfront = new CloudFrontToS3(this, 'image-cloudfront', {
      insertHttpSecurityHeaders: false,
      bucketProps: {
        bucketName: 'image-inventory-bucket',
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true
      },
      cloudFrontLoggingBucketProps: {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      },
      loggingBucketProps: {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    })
    
    const wafImageCloudFront = new WafwebaclToCloudFront(this, 'wafwebacl-image-cloudfront', {
      existingCloudFrontWebDistribution: imageCloudfront.cloudFrontWebDistribution
    });

    const lambdaDynamoDB = new LambdaToDynamoDB(this, 'Lambda-DynamoDB', {
      dynamoTableProps: {
        tableName: 'db-inventory-cdk',
        partitionKey: { name: 'product_id', type: AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
      },
      lambdaFunctionProps: {
        functionName: 'inventory-lambda-cdk',
        runtime: Runtime.PYTHON_3_9,
        code: Code.fromInline('def handler(): print("Hello World")'),
        handler: 'lambda_function.handler',
        environment: {
          ['BUCKET_NAME']: `${imageCloudfront.s3Bucket?.bucketName}`,
          ['CLOUDFRONT_ID']: imageCloudfront.cloudFrontWebDistribution.distributionId
        },
        initialPolicy: [
          new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject"
          ],
          resources: [`${imageCloudfront.s3Bucket?.bucketArn}/*`]
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["cloudfront:CreateInvalidation"],
            resources: [`arn:aws:cloudfront::${Aws.ACCOUNT_ID}:distribution/${imageCloudfront.cloudFrontWebDistribution.distributionId}`]
            })
        ]
      },
      tableEnvironmentVariableName: 'TABLE_NAME',
    })

    const cognitoApigatewayLambda = new CognitoToApiGatewayToLambda(this, 'Cognito-Apigateway-Lambda', {
      cognitoUserPoolProps: {
        userPoolName: 'Inventory-Users',
        accountRecovery: AccountRecovery.NONE,
        signInAliases: {username: false, email: true},
        autoVerify: {email: true, phone: false},
        removalPolicy: RemovalPolicy.DESTROY
      },
      cognitoUserPoolClientProps: {
        oAuth: {
          flows: {
            implicitCodeGrant: true,
          },
          callbackUrls: [
            `https://${frontCloudfront.cloudFrontWebDistribution.distributionDomainName}`,
          ],
        },
        userPoolClientName: 'inventory-client'  
      },
      apiGatewayProps: {
        restApiName: 'inventory-API-CDK',
        defaultCorsPreflightOptions: {
          allowOrigins: ['*'],
          allowHeaders: ['Content-Type','X-Amz-Date','Authorization','X-Api-Key','X-Amz-Security-Token'],
          allowMethods: ['POST','OPTIONS','GET','PUT','DELETE']
        }
      },
      existingLambdaObj: lambdaDynamoDB.lambdaFunction
    })
    const cognitoDomain=cognitoApigatewayLambda.userPool.addDomain('invntoryvk',{
      cognitoDomain: {
        domainPrefix: 'inventoryvk'
      }
    })

    const wafApiGateway = new WafwebaclToApiGateway(this, 'wafwebacl-apigateway', {
      existingApiGatewayInterface: cognitoApigatewayLambda.apiGateway,
      webaclProps: wafWebACLApigatewayProps
    })
    
    interface OutputsResources {
        [key: string]:string
    }
    const outputsResources: OutputsResources ={
      region: Aws.REGION,
      apigatewayURL: cognitoApigatewayLambda.apiGateway.url,
      imageCloudFrontURL: imageCloudfront.cloudFrontWebDistribution.domainName,
      frontBucket: `${frontCloudfront.s3Bucket?.bucketName}`,
      frontCloudfrontID: frontCloudfront.cloudFrontWebDistribution.distributionId,
      lambdaFunction: lambdaDynamoDB.lambdaFunction.functionName,
      cognitoURL: `https://${cognitoDomain.domainName}.auth.${Aws.REGION}.amazoncognito.com/login?response_type=token&client_id=${cognitoApigatewayLambda.userPoolClient.userPoolClientId}&redirect_uri=https://${frontCloudfront.cloudFrontWebDistribution.domainName}`
    }

    Object.keys(outputsResources).forEach((output) => {
      new ssm.StringParameter(this, output, {
        parameterName: output,
        stringValue: outputsResources[output]
      })
    })
  } 
}
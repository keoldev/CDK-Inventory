import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3' 
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb'
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { AccountRecovery } from 'aws-cdk-lib/aws-cognito';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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
        environment: {['BUCKET_NAME']: `${imageCloudfront.s3Bucket?.bucketName}`},
        initialPolicy: [new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject"
          ],
          resources: [`${imageCloudfront.s3Bucket?.bucketArn}/*`]
        })]
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
          }
        }
      },
      apiGatewayProps: {
        defaultCorsPreflightOptions: {
          allowOrigins: ['*'],
          allowHeaders: ['Content-Type','X-Amz-Date','Authorization','X-Api-Key','X-Amz-Security-Token'],
          allowMethods: ['POST','OPTIONS','GET','PUT','DELETE'],
        }
      },
      existingLambdaObj: lambdaDynamoDB.lambdaFunction
    })
    cognitoApigatewayLambda.userPool.addDomain('invntoryvk',{
      cognitoDomain: {
        domainPrefix: 'inventoryvk'
      }
    })

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
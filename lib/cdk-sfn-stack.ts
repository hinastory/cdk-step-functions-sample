import * as cdk from "@aws-cdk/core";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import * as s3 from "@aws-cdk/aws-s3";
import { BlockPublicAccess } from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { RemovalPolicy } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
export class CdkSfnStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.simpleWorkflow("sfn-simple");
    this.advancedWorkflow("sfn-advanced");
  }

  private simpleWorkflow(stackPrefix: string) {
    const start = new sfn.Pass(this, "Start", {
      result: sfn.Result.fromObject({
        name: "hinastory",
      }),
    });

    const helloFunc = new NodejsFunction(this, "hello", {
      entry: "lambda/hello/index.ts",
      handler: "handler",
    });

    const helloTask = new tasks.LambdaInvoke(this, "helloTask", {
      lambdaFunction: helloFunc,
      payloadResponseOnly: true,
    });

    const end = new sfn.Pass(this, "End", {});

    const definition = start.next(helloTask).next(end);

    const stateMachine = new sfn.StateMachine(
      this,
      `${stackPrefix}-state-machine`,
      {
        stateMachineName: `${stackPrefix}-state-machine`,
        definition,
      }
    );
  }

  private createTestData(bucketName: string) {
    const bucket = new s3.Bucket(this, bucketName, {
      bucketName: bucketName,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    new s3deploy.BucketDeployment(this, "deploy1", {
      sources: [s3deploy.Source.asset("assets/test")],
      destinationBucket: bucket,
      retainOnDelete: false,
      destinationKeyPrefix: "private/aaa/001",
    });

    new s3deploy.BucketDeployment(this, "deploy2", {
      sources: [s3deploy.Source.asset("assets/test")],
      destinationBucket: bucket,
      retainOnDelete: false,
      destinationKeyPrefix: "private/aaa/002",
    });

    new s3deploy.BucketDeployment(this, "deploy3", {
      sources: [s3deploy.Source.asset("assets/test")],
      destinationBucket: bucket,
      retainOnDelete: false,
      destinationKeyPrefix: "private/bbb/023",
    });
  }

  private advancedWorkflow(stackPrefix: string) {
    const bucketName = `${stackPrefix}-sfn-test`;
    const first = new sfn.Pass(this, "First", {
      result: sfn.Result.fromObject({
        Bucket: bucketName,
        Prefix: "private/",
        Delimiter: "/",
      }),
      resultPath: "$.location",
    });

    this.createTestData(bucketName);

    const listObjects = new NodejsFunction(this, "list-s3", {
      entry: "lambda/list-s3/index.ts",
      handler: "handler",
    });

    listObjects.addToRolePolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["s3:*"],
      })
    );

    const listFirstDirTask = new tasks.LambdaInvoke(this, "listFirstDirTask", {
      lambdaFunction: listObjects,
      payloadResponseOnly: true,
    });

    const firstDirMap = new sfn.Map(this, "firstDirMap", {
      maxConcurrency: 3,
      itemsPath: sfn.JsonPath.stringAt("$.CommonPrefixes"),
    });

    const testLambda = lambda.Function.fromFunctionArn(
      this,
      "test-func",
      "arn:aws:lambda:ap-northeast-1:071000381825:function:cats-cats-cats"
    );

    const listPayload = sfn.TaskInput.fromObject({
      location: {
        Bucket: bucketName,
        Prefix: sfn.JsonPath.stringAt("$.Prefix"),
        Delimiter: "/",
      },
    });

    const testTask = new tasks.LambdaInvoke(this, "testLambda", {
      lambdaFunction: testLambda,
      payloadResponseOnly: true,
    });

    const listSecondDirTask = new tasks.LambdaInvoke(
      this,
      "listSecondDirTask",
      {
        lambdaFunction: listObjects,
        payload: listPayload,
        payloadResponseOnly: true,
      }
    );

    const secondDirMap = new sfn.Map(this, "secondDirMap", {
      maxConcurrency: 3,
      itemsPath: sfn.JsonPath.stringAt("$.CommonPrefixes"),
    });

    const done = new sfn.Pass(this, "Done", {});

    const definition = first
      .next(listFirstDirTask)
      .next(firstDirMap)
      .next(done);

    firstDirMap.iterator(
      listSecondDirTask.next(secondDirMap.iterator(testTask))
    );

    const stateMachine = new sfn.StateMachine(
      this,
      `${stackPrefix}-state-machine`,
      {
        stateMachineName: `${stackPrefix}-state-machine`,
        definition,
      }
    );
  }
}

import * as lambda from "aws-lambda";
import * as aws from "aws-sdk";
import { delimiter } from "path";

export async function handler(
  event: Event,
  context: lambda.Context,
  callback: lambda.Callback
) {
  console.log(event);
  const s3 = new aws.S3();
  const params: aws.S3.ListObjectsV2Request = event.location;
  const res = await s3.listObjectsV2(params).promise();
  console.log(res);
  return res;
}

type Event = {
  location: {
    Bucket: string;
    Prefix: string;
  };
};

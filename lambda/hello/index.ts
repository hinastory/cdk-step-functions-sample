import * as lambda from "aws-lambda";

export async function handler(
  event: Event,
  context: lambda.Context,
  callback: lambda.Callback
) {
  return `hello ${event.name}`;
}

type Event = {
  name: string;
};
